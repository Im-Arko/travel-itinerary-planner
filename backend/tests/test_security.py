"""Security regressions run against an isolated database; never the configured DB."""
import os
os.environ["APP_ENV"] = "test"
os.environ["SECRET_KEY"] = "test-only-" + "C2j8rNV7my5WqZ9Hk3LBd6F4tsX0pA1u"
os.environ["TRUSTED_HOSTS"] = "testserver,localhost"
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
os.environ["ADMIN_USER_IDS"] = ""
import asyncio
from datetime import datetime, timedelta, timezone
import json
import unittest
from unittest.mock import patch
import bcrypt
import jwt
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from backend.app.main import app
from backend.app.config import Settings
from backend.app.database.models import Base, User, Itinerary, ItineraryDay, UserPreference, SecurityRateLimit
from backend.app.database.session import get_db
from backend.app.security import RequestProtection, enforce_limit
from backend.app.services import auth_service

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
@event.listens_for(engine, "connect")
def enable_foreign_keys(connection, record):
    connection.execute("PRAGMA foreign_keys=ON")

Session = sessionmaker(bind=engine)
def isolated_db():
    with Session() as db:
        yield db


class SecurityTests(unittest.TestCase):
    def setUp(self):
        Base.metadata.drop_all(engine)
        Base.metadata.create_all(engine)
        app.dependency_overrides[get_db] = isolated_db
        self.client = TestClient(app, raise_server_exceptions=False)
        self.db = Session()
        for name in ("alice", "bob"):
            self.db.add(User(username=name, email=f"{name}@example.com", password_hash=auth_service.hash_password("a long passphrase")))
        self.db.commit()
        self.alice = self.db.query(User).filter_by(username="alice").one()
        self.bob = self.db.query(User).filter_by(username="bob").one()
        self.headers = {"Authorization": "Bearer " + auth_service.create_access_token({"sub": str(self.alice.id)})}

    def tearDown(self):
        self.db.close()
        self.client.close()
        app.dependency_overrides.clear()

    def test_registration_and_login(self):
        response = self.client.post("/api/auth/register", json={
            "username": "Charlie", "email": "charlie@example.com", "password": "a strong passphrase",
        })
        self.assertEqual(response.status_code, 201, response.text)
        user = self.db.query(User).filter_by(username="charlie").one()
        self.assertTrue(user.password_hash.startswith("$argon2id$"))
        self.assertNotIn("password", response.text)
        token = self.client.post("/api/auth/login", data={"username": "charlie@example.com", "password": "a strong passphrase"})
        self.assertEqual(token.status_code, 200, token.text)
        me = self.client.get("/api/auth/me", headers={"Authorization": "Bearer " + token.json()["access_token"]})
        self.assertEqual(me.json()["username"], "charlie")

    def test_validation_and_password_redaction(self):
        response = self.client.post("/api/auth/register", json={"username": "x", "email": "x@example.com", "password": "secret"})
        self.assertEqual(response.status_code, 422)
        self.assertNotIn("secret", response.text)
        self.assertNotIn('"input"', response.text)
        self.assertEqual(self.client.post("/api/auth/register", json={
            "username": "charlie", "email": "charlie@example.com", "password": "a strong passphrase", "is_admin": True
        }).status_code, 422)
        for payload in ({"budget":"unknown"}, {"budget":"moderate","interests":["a"]*21}, {"budget":"moderate","trip_duration":31}, {"budget":"moderate","destination_hint":"a"*501}):
            self.assertEqual(self.client.post("/api/itineraries/generate", json=payload, headers=self.headers).status_code, 422)

    def test_duplicate_registration(self):
        response = self.client.post("/api/auth/register", json={
            "username":"alice", "email":"alice@example.com", "password":"a strong passphrase"})
        self.assertEqual(response.status_code, 409)

    def test_account_deletion_requires_password(self):
        self.assertEqual(self.client.request("DELETE", "/api/auth/me", headers=self.headers).status_code, 422)
        self.assertEqual(self.client.request("DELETE", "/api/auth/me", headers=self.headers, json={"password":"wrong"}).status_code, 401)
        response = self.client.request("DELETE", "/api/auth/me", headers=self.headers, json={"password":"a long passphrase"})
        self.assertEqual(response.status_code, 204, response.text)
        self.assertEqual(self.client.get("/api/auth/me", headers=self.headers).status_code, 401)

    def test_bcrypt_upgrade_and_no_truncation(self):
        self.alice.password_hash = bcrypt.hashpw(b"legacy password", bcrypt.gensalt()).decode()
        self.db.commit()
        response = self.client.post("/api/auth/login", data={"username":"alice@example.com", "password":"legacy password"})
        self.assertEqual(response.status_code, 200, response.text)
        self.db.refresh(self.alice)
        self.assertTrue(self.alice.password_hash.startswith("$argon2id$"))
        hashed = bcrypt.hashpw(b"a"*72, bcrypt.gensalt()).decode()
        self.assertFalse(auth_service.verify_password("a"*73, hashed))

    def test_invalid_credentials_are_generic(self):
        responses = []
        for email in ("alice@example.com", "unknown@example.com"):
            responses.append(self.client.post("/api/auth/login", data={"username":email,"password":"wrong"}))
        self.assertEqual([r.status_code for r in responses], [401,401])
        self.assertEqual(responses[0].json(), responses[1].json())
        self.alice.is_active = False
        self.db.commit()
        self.assertEqual(self.client.get("/api/auth/me", headers=self.headers).status_code, 401)

    def test_reject_invalid_tokens(self):
        now = datetime.now(timezone.utc)
        valid = {"sub":str(self.alice.id), "iat":now, "nbf":now, "exp":now+timedelta(minutes=10),
                 "iss":auth_service.settings.jwt_issuer, "aud":auth_service.settings.jwt_audience, "jti":"test", "type":"access"}
        cases = [{**valid,"sub":"not-an-id"}, {**valid,"sub":"9"*100}, {**valid,"exp":now-timedelta(seconds=10)}, {**valid,"aud":"other"}, {**valid,"type":"refresh"}, {"sub":str(self.alice.id)}]
        for claims in cases:
            token = jwt.encode(claims, auth_service.settings.secret_key, algorithm="HS256")
            self.assertEqual(self.client.get("/api/auth/me", headers={"Authorization":"Bearer "+token}).status_code, 401)
        token = jwt.encode(valid, "a-different-secret-of-at-least-32-bytes", algorithm="HS256")
        self.assertEqual(self.client.get("/api/auth/me", headers={"Authorization":"Bearer "+token}).status_code, 401)

    def test_cross_user_itineraries_are_inaccessible(self):
        itinerary = Itinerary(user_id=self.bob.id, title="Private", destination_name="Kyoto",duration_days=1,budget="moderate",full_itinerary="{}")
        self.db.add(itinerary); self.db.commit()
        path = f"/api/itineraries/{itinerary.id}"
        for method, kwargs in (("get",{}),("patch",{"json":{"title":"stolen"}}),("delete",{})):
            self.assertEqual(getattr(self.client,method)(path,headers=self.headers,**kwargs).status_code,404)
        self.assertEqual(self.client.get("/api/itineraries/",headers=self.headers).json(),[])

    def test_admin_ingestion_is_restricted(self):
        self.assertEqual(self.client.post("/api/destinations/ingest",json={},headers=self.headers).status_code,403)
        with patch.object(auth_service.settings, "admin_user_ids", str(self.alice.id)), patch("backend.app.schemas.vector_store.ingest_destinations",return_value=3):
            self.assertEqual(self.client.post("/api/destinations/ingest",json={},headers=self.headers).json()["ingested"],3)

    def test_shared_rate_limits_and_spoofed_headers(self):
        for _ in range(20):
            response=self.client.post("/api/auth/login",data={"username":"not-an-email","password":"wrong"})
            self.assertEqual(response.status_code,422)
        response=self.client.post("/api/auth/login",data={"username":"alice@example.com","password":"wrong"},headers={"X-Forwarded-For":"1.2.3.4"})
        self.assertEqual(response.status_code,429,response.text)
        self.assertIn("Retry-After",response.headers)
        self.assertEqual(self.db.query(SecurityRateLimit).count(),1)


    def test_request_limits_hosts_and_cors(self):
        response=self.client.post("/api/auth/register",content=b"x"*65537)
        self.assertEqual(response.status_code,413)
        self.assertEqual(self.client.get("/health",headers={"Host":"evil.example"}).status_code,400)
        response=self.client.get("/health",headers={"Origin":"https://evil.example"})
        self.assertNotIn("access-control-allow-origin",response.headers)
        response=self.client.get("/health",headers={"Origin":"http://localhost:5173"})
        self.assertEqual(response.headers["access-control-allow-origin"],"http://localhost:5173")
        self.assertEqual(response.headers["x-content-type-options"],"nosniff")
        self.assertEqual(response.headers["cache-control"],"no-store")
        self.assertEqual(self.client.get("/health?"+"x"*4097).status_code,414)

    def test_chunked_body_limit(self):
        messages = iter([{"type":"http.request","body":b"x"*40000,"more_body":True},
                         {"type":"http.request","body":b"x"*40000,"more_body":False}])
        sent=[]
        async def receive(): return next(messages)
        async def send(message): sent.append(message)
        async def should_not_run(scope, receive, send): self.fail("Oversized body reached the app")
        asyncio.run(RequestProtection(should_not_run)({"type":"http","method":"POST","path":"/","headers":[],"query_string":b""},receive,send))
        self.assertEqual(sent[0]["status"],413)

    def test_database_constraints_and_cascade(self):
        self.db.add_all([UserPreference(user_id=self.alice.id),UserPreference(user_id=self.alice.id)])
        with self.assertRaises(IntegrityError): self.db.commit()
        self.db.rollback()
        self.db.add(Itinerary(user_id=self.alice.id,title="Trip",destination_name="Kyoto",duration_days=31,budget="moderate",full_itinerary="{}"))
        with self.assertRaises(IntegrityError): self.db.commit()
        self.db.rollback()
        itinerary=Itinerary(user_id=self.alice.id,title="Trip",destination_name="Kyoto",duration_days=1,budget="moderate",full_itinerary="{}")
        self.db.add(itinerary); self.db.commit()
        self.db.add_all([ItineraryDay(itinerary_id=itinerary.id,day_number=1),ItineraryDay(itinerary_id=itinerary.id,day_number=1)])
        with self.assertRaises(IntegrityError): self.db.commit()
        self.db.rollback()
        self.db.execute(text("DELETE FROM users WHERE id=:id"),{"id":self.alice.id}); self.db.commit()
        self.assertEqual(self.db.query(Itinerary).count(),0)










    def test_database_embedding_search_and_reingestion(self):
        from backend.app.database.models import Destination, DestinationEmbedding
        from backend.app.schemas import vector_store
        test = self
        class Embedder:
            def encode(self, texts, **kwargs):
                test.assertFalse(test.db.in_transaction(), "Inference must not hold an idle database transaction")
                return [[1.0, 0.0] if "beach" in value.lower() else [0.0, 1.0] for value in texts]
        self.db.add_all([
            Destination(name="Coast",country="Test",description="beach",climate_type="tropical",destination_type="beach",budget_level="budget"),
            Destination(name="Alps",country="Test",description="mountains",climate_type="cold",destination_type="mountain",budget_level="luxury"),
        ])
        self.db.commit()
        def load_embedder():
            self.assertFalse(self.db.in_transaction(), "Cold model loading must not hold a database connection")
            return Embedder()
        with patch.object(vector_store,"_get_embedder",side_effect=load_embedder):
            self.assertEqual(vector_store.ingest_destinations(self.db),2)
            self.assertEqual(vector_store.ingest_destinations(self.db),2)
            self.assertEqual(vector_store.collection_count(self.db),2)
            results=vector_store.semantic_search(self.db,"beach")
            self.assertEqual(results[0]["name"],"Coast")
            self.assertEqual(results[0]["score"],1.0)
            self.assertEqual(vector_store.semantic_search(self.db,"beach",budget_filter="luxury")[0]["name"],"Alps")
            self.assertEqual(vector_store.ingest_destinations(self.db,[]),0)
        self.db.execute(text("DELETE FROM destinations WHERE name='Coast'")); self.db.commit()
        self.assertEqual(self.db.query(DestinationEmbedding).count(),1)
        with self.assertRaises(ValueError): vector_store._validated_vector([float("nan")])

    def test_model_work_never_discards_pending_writes(self):
        from backend.app.database.session import release_read_transaction
        self.alice.full_name = "Pending change"
        with self.assertRaises(RuntimeError):
            release_read_transaction(self.db)
        self.assertEqual(self.alice.full_name, "Pending change")
        self.assertIn(self.alice, self.db.dirty)

    def test_settings_fail_closed(self):
        with self.assertRaises(ValueError): Settings(_env_file=None,secret_key="short")
        with self.assertRaises(ValueError): Settings(_env_file=None,trusted_hosts="*")
        with self.assertRaises(ValueError): Settings(_env_file=None,app_env="production",db_user="root")


if __name__ == "__main__":
    unittest.main()
