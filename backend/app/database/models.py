from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, DateTime, Boolean,
    Enum, ForeignKey, DECIMAL, SmallInteger, JSON
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    username      = Column(String(50), unique=True, nullable=False, index=True)
    email         = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name     = Column(String(100))
    avatar_url    = Column(String(500))
    created_at    = Column(DateTime, default=datetime.utcnow)
    updated_at    = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active     = Column(Boolean, default=True)

    preferences   = relationship("UserPreference", back_populates="user", cascade="all, delete-orphan")
    itineraries   = relationship("Itinerary", back_populates="user", cascade="all, delete-orphan")


class UserPreference(Base):
    __tablename__ = "user_preferences"

    id                = Column(Integer, primary_key=True, autoincrement=True)
    user_id           = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    budget            = Column(Enum("budget", "moderate", "luxury"), default="moderate")
    preferred_climate = Column(Enum("tropical", "temperate", "arid", "cold", "mediterranean", "any"), default="any")
    destination_type  = Column(Enum("beach", "mountain", "city", "countryside", "adventure", "cultural", "any"), default="any")
    trip_duration     = Column(SmallInteger, default=7)
    travel_style      = Column(String(50), default="solo")
    interests         = Column(Text)          # JSON array
    dietary_needs     = Column(String(255))
    accessibility     = Column(Boolean, default=False)
    created_at        = Column(DateTime, default=datetime.utcnow)
    updated_at        = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="preferences")


class Destination(Base):
    __tablename__ = "destinations"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    name             = Column(String(150), nullable=False)
    country          = Column(String(100), nullable=False)
    continent        = Column(String(50))
    description      = Column(Text, nullable=False)
    climate_type     = Column(Enum("tropical", "temperate", "arid", "cold", "mediterranean"), nullable=False)
    destination_type = Column(Enum("beach", "mountain", "city", "countryside", "adventure", "cultural"), nullable=False)
    budget_level     = Column(Enum("budget", "moderate", "luxury"), nullable=False)
    best_months      = Column(String(100))
    avg_temp_c       = Column(DECIMAL(4, 1))
    tags             = Column(Text)           # JSON array
    image_url        = Column(String(500))
    latitude         = Column(DECIMAL(9, 6))
    longitude        = Column(DECIMAL(9, 6))
    chroma_doc_id    = Column(String(100))
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    itineraries = relationship("Itinerary", back_populates="destination")


class Itinerary(Base):
    __tablename__ = "itineraries"

    id               = Column(Integer, primary_key=True, autoincrement=True)
    user_id          = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    destination_id   = Column(Integer, ForeignKey("destinations.id", ondelete="SET NULL"), nullable=True)
    title            = Column(String(255), nullable=False)
    destination_name = Column(String(150), nullable=False)
    duration_days    = Column(SmallInteger, nullable=False)
    budget           = Column(Enum("budget", "moderate", "luxury"), nullable=False)
    travel_style     = Column(String(50))
    summary          = Column(Text)
    full_itinerary   = Column(Text, nullable=False)  # JSON
    status           = Column(Enum("draft", "saved", "archived"), default="saved")
    is_favorite      = Column(Boolean, default=False)
    rating           = Column(SmallInteger)
    user_notes       = Column(Text)
    generated_at     = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user        = relationship("User", back_populates="itineraries")
    destination = relationship("Destination", back_populates="itineraries")
    days        = relationship("ItineraryDay", back_populates="itinerary", cascade="all, delete-orphan",
                               order_by="ItineraryDay.day_number")


class ItineraryDay(Base):
    __tablename__ = "itinerary_days"

    id             = Column(Integer, primary_key=True, autoincrement=True)
    itinerary_id   = Column(Integer, ForeignKey("itineraries.id", ondelete="CASCADE"), nullable=False)
    day_number     = Column(SmallInteger, nullable=False)
    theme          = Column(String(255))
    morning        = Column(Text)
    afternoon      = Column(Text)
    evening        = Column(Text)
    accommodation  = Column(String(255))
    estimated_cost = Column(DECIMAL(10, 2))
    tips           = Column(Text)

    itinerary = relationship("Itinerary", back_populates="days")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id          = Column(Integer, primary_key=True, autoincrement=True)
    user_id     = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    token_hash  = Column(String(255), unique=True, nullable=False)
    expires_at  = Column(DateTime, nullable=False)
    created_at  = Column(DateTime, default=datetime.utcnow)
    revoked     = Column(Boolean, default=False)
