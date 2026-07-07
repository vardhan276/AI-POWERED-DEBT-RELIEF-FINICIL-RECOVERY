from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    Email: EmailStr
    Name: str

class UserCreate(UserBase):
    Password: str

class UserUpdateProfile(BaseModel):
    Name: Optional[str] = None
    MonthlyIncome: Optional[float] = None
    MonthlyExpenses: Optional[float] = None

class UserResponse(UserBase):
    UserID: int
    MonthlyIncome: float
    MonthlyExpenses: float

    class Config:
        from_attributes = True

# Financial Profile Schemas
class FinancialProfileResponse(BaseModel):
    ProfileID: int
    UserID: int
    EMI_Ratio: float
    DTI_Ratio: float
    MonthlySurplus: float
    StressLevel: str

    class Config:
        from_attributes = True

# Loan Schemas
class LoanBase(BaseModel):
    LenderName: str
    LoanType: str
    OutstandingAmount: float
    InterestRate: float
    EMI: float
    OverdueMonths: int

class LoanCreate(LoanBase):
    pass

class LoanResponse(LoanBase):
    LoanID: int
    UserID: int

    class Config:
        from_attributes = True

# Settlement Prediction Schemas
class SettlementPredictionResponse(BaseModel):
    SettlementID: int
    LoanID: int
    SuggestedSettlement: float
    RiskCategory: str
    PredictedAmount: float

    class Config:
        from_attributes = True

# AI Negotiation Schemas
class AINegotiationCreate(BaseModel):
    LoanID: int
    HardshipReason: str  # e.g., "Job Loss", "Medical Issue", "Divorce", "Interest Rate Hike"
    ProposedSettlementPercent: Optional[float] = None  # User can suggest their target percentage
    AdditionalDetails: Optional[str] = None

class AINegotiationResponse(BaseModel):
    AI_ID: int
    LoanID: int
    UserID: int
    NegotiationStrategy: str
    NegotiationLetter: str
    GeneratedDate: datetime

    class Config:
        from_attributes = True

# AI History Schemas
class AIHistoryResponse(BaseModel):
    HistoryID: int
    UserID: int
    GeneratedContent: str
    QueryType: str
    Timestamp: datetime

    class Config:
        from_attributes = True

# Dashboard Overview response
class DashboardOverview(BaseModel):
    User: UserResponse
    Profile: Optional[FinancialProfileResponse] = None
    Loans: List[LoanResponse]
    TotalOutstanding: float
    TotalEMI: float
    MonthlySurplus: float
