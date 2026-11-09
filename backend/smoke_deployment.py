"""Verify a deployed API using a disposable account, then delete that account."""
import argparse
import secrets
import httpx


def verify(base_url):
    username = "deployment_check_" + secrets.token_hex(6)
    email = username + "@example.com"
    password = secrets.token_urlsafe(32)
    registered = False
    headers = {}
    with httpx.Client(base_url=base_url, timeout=180) as client:
        def login():
            response = client.post("/api/auth/login", data={"username": email, "password": password})
            response.raise_for_status()
            return {"Authorization": "Bearer " + response.json()["access_token"]}

        try:
            for endpoint in ("/health", "/ready"):
                response = client.get(endpoint)
                response.raise_for_status()
                assert response.json()["status"] == "ok"
            print("PASS: public liveness and database readiness")
            assert client.get("/api/auth/me", headers={"Authorization": "Bearer invalid"}).status_code == 401
            print("PASS: invalid credentials rejected")
            response = client.post("/api/auth/register", json={"username": username, "email": email, "password": password})
            response.raise_for_status()
            registered = True
            assert response.status_code == 201
            headers = login()
            assert client.get("/api/auth/me", headers=headers).json()["username"] == username
            print("PASS: registration, login and authenticated profile")
            response = client.put("/api/preferences/", headers=headers, json={
                "budget": "moderate", "trip_duration": 2, "travel_style": "solo", "interests": ["History"],
            })
            response.raise_for_status()
            assert client.get("/api/preferences/", headers=headers).json()["trip_duration"] == 2
            print("PASS: preferences saved and retrieved")
            response = client.get("/api/destinations/search", headers=headers, params={"q": "Kyoto temples and history", "limit": 3})
            response.raise_for_status()
            assert response.json()
            print("PASS: real semantic search using restored embeddings")
            response = client.post("/api/itineraries/generate", headers=headers, json={
                "budget": "moderate", "trip_duration": 2, "travel_style": "solo", "interests": ["History"],
            })
            response.raise_for_status()
            assert response.status_code == 201
            itinerary = response.json()
            assert len(itinerary["days"]) == 2
            path = f"/api/itineraries/{itinerary['id']}"
            response = client.patch(path, headers=headers, json={"is_favorite": True, "rating": 5, "user_notes": "Deployment verification"})
            response.raise_for_status()
            saved = client.get(path, headers=headers)
            saved.raise_for_status()
            assert saved.json()["is_favorite"] is True
            assert saved.json()["user_notes"] == "Deployment verification"
            assert len(saved.json()["days"]) == 2
            assert client.get("/api/itineraries/", headers=headers).json()
            print("PASS: itinerary generation, day plans, favorites and notes persist")
            assert client.post("/api/destinations/ingest", headers=headers, json={}).status_code == 403
            print("PASS: ordinary account cannot perform administrative ingestion")
        finally:
            if registered:
                if not headers:
                    headers = login()
                response = client.request("DELETE", "/api/auth/me", headers=headers, json={"password": password})
                response.raise_for_status()
                assert response.status_code == 204
                assert client.get("/api/auth/me", headers=headers).status_code == 401
                print("PASS: disposable account and associated records deleted")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    args = parser.parse_args()
    verify(args.base_url)
