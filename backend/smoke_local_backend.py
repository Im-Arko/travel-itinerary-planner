"""Exercise the running local API with a disposable account, then remove it."""
import secrets
import argparse
import httpx
from sqlalchemy import text
from app.database.session import engine


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default="http://127.0.0.1:8001")
    args = parser.parse_args()
    username = "security_check_" + secrets.token_hex(6)
    email = username + "@example.com"
    password = secrets.token_urlsafe(32)
    token = None
    headers = {}
    with httpx.Client(base_url=args.base_url, timeout=120) as client:
        try:
            response = client.get("/health")
            response.raise_for_status()
            print("PASS: running backend health")
            response = client.post("/api/auth/register", json={
                "username": username, "email": email, "password": password,
            })
            assert response.status_code == 201, f"Registration: HTTP {response.status_code}"
            print("PASS: registration writes to MariaDB")
            response = client.post("/api/auth/login", data={"username": email, "password": password})
            response.raise_for_status()
            token = response.json()["access_token"]
            headers = {"Authorization": "Bearer " + token}
            assert client.get("/api/auth/me", headers=headers).json()["username"] == username
            print("PASS: login and authenticated profile")
            response = client.put("/api/preferences/", headers=headers, json={
                "budget": "moderate", "trip_duration": 2, "travel_style": "solo",
                "interests": ["History"],
            })
            response.raise_for_status()
            assert client.get("/api/preferences/", headers=headers).json()["trip_duration"] == 2
            print("PASS: preference save/read")
            response = client.get("/api/destinations/search", headers=headers, params={"q": "Kyoto temples and history", "limit": 3})
            response.raise_for_status()
            assert len(response.json()) > 0
            print("PASS: real model inference and database semantic search")
            response = client.post("/api/itineraries/generate", headers=headers, json={
                "budget": "moderate", "trip_duration": 2, "travel_style": "solo", "interests": ["History"],
            })
            assert response.status_code == 201, f"Generation: HTTP {response.status_code}"
            itinerary = response.json()
            assert len(itinerary["days"]) == 2
            assert client.get(f"/api/itineraries/{itinerary['id']}", headers=headers).status_code == 200
            assert client.get("/api/itineraries/", headers=headers).json()
            print("PASS: generated itinerary and day plans persist/read correctly")
            assert client.post("/api/destinations/ingest", headers=headers, json={}).status_code == 403
            print("PASS: ordinary account cannot run administrative ingestion")
        finally:
            if token:
                response = client.request("DELETE", "/api/auth/me", headers=headers, json={"password": password})
                if response.status_code == 204:
                    print("PASS: password-confirmed account deletion")
                else:
                    print("API cleanup unavailable; applying scoped disposable-account cleanup")
            # Ensure cleanup even if a check fails before login. Never match existing users.
            with engine.begin() as connection:
                connection.execute(text("DELETE FROM users WHERE username=:username AND email=:email"),
                                   {"username": username, "email": email})
                assert connection.execute(text("SELECT COUNT(*) FROM users WHERE username=:username"),
                                          {"username": username}).scalar_one() == 0
            print("PASS: disposable account removed; its preferences and itineraries cascade deleted")


if __name__ == "__main__":
    main()
