from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    UserID = Column(Integer, primary_key=True, index=True)
    Name = Column(String, nullable=False)
    Email = Column(String, unique=True, index=True, nullable=False)
    Password = Column(String, nullable=False)
    MonthlyIncome = Column(Float, default=0.0)
    MonthlyExpenses = Column(Float, default=0.0)

    # Relationships
    financial_profile = relationship("FinancialProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    loans = relationship("Loan", back_populates="user", cascade="all, delete-orphan")
    ai_histories = relationship("AIHistory", back_populates="user", cascade="all, delete-orphan")
    ai_negotiations = relationship("AINegotiation", back_populates="user", cascade="all, delete-orphan")


class FinancialProfile(Base):
    __tablename__ = "financial_profile"

    ProfileID = Column(Integer, primary_key=True, index=True)
    UserID = Column(Integer, ForeignKey("users.UserID"), unique=True, nullable=False)
    EMI_Ratio = Column(Float, default=0.0)
    DTI_Ratio = Column(Float, default=0.0)
    MonthlySurplus = Column(Float, default=0.0)
    StressLevel = Column(String, default="Low")

    # Relationships
    user = relationship("User", back_populates="financial_profile")


class Loan(Base):
    __tablename__ = "loans"

    LoanID = Column(Integer, primary_key=True, index=True)
    UserID = Column(Integer, ForeignKey("users.UserID"), nullable=False)
    LenderName = Column(String, nullable=False)
    LoanType = Column(String, nullable=False)
    OutstandingAmount = Column(Float, default=0.0)
    InterestRate = Column(Float, default=0.0)
    EMI = Column(Float, default=0.0)
    OverdueMonths = Column(Integer, default=0)

    # Relationships
    user = relationship("User", back_populates="loans")
    settlement_predictions = relationship("SettlementPrediction", back_populates="loan", cascade="all, delete-orphan")
    ai_negotiations = relationship("AINegotiation", back_populates="loan", cascade="all, delete-orphan")


class SettlementPrediction(Base):
    __tablename__ = "settlement_prediction"

    SettlementID = Column(Integer, primary_key=True, index=True)
    LoanID = Column(Integer, ForeignKey("loans.LoanID"), nullable=False)
    SuggestedSettlement = Column(Float, nullable=False)  # target settlement percentage, e.g. 45.0
    RiskCategory = Column(String, nullable=False)        # Low, Medium, High, Severe
    PredictedAmount = Column(Float, nullable=False)      # calculated dollar amount to settle, e.g. Outstanding * SuggestedSettlement / 100

    # Relationships
    loan = relationship("Loan", back_populates="settlement_predictions")


class AINegotiation(Base):
    __tablename__ = "ai_negotiation"

    AI_ID = Column(Integer, primary_key=True, index=True)
    LoanID = Column(Integer, ForeignKey("loans.LoanID"), nullable=False)
    UserID = Column(Integer, ForeignKey("users.UserID"), nullable=False)
    NegotiationStrategy = Column(Text, nullable=False)
    NegotiationLetter = Column(Text, nullable=False)
    GeneratedDate = Column(DateTime, default=datetime.utcnow)

    # Relationships
    loan = relationship("Loan", back_populates="ai_negotiations")
    user = relationship("User", back_populates="ai_negotiations")


class AIHistory(Base):
    __tablename__ = "ai_history"

    HistoryID = Column(Integer, primary_key=True, index=True)
    UserID = Column(Integer, ForeignKey("users.UserID"), nullable=False)
    GeneratedContent = Column(Text, nullable=False)
    QueryType = Column(String, nullable=False)  # e.g., "Settlement Prediction Review", "Hardship Letter Draft"
    Timestamp = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="ai_histories")
