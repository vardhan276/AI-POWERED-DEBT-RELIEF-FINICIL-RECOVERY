from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List

from .config import settings
from .database import engine, Base, get_db
from .models import User, Loan, FinancialProfile, SettlementPrediction, AINegotiation, AIHistory
from .schemas import (
    UserCreate, UserResponse, UserUpdateProfile, Token, LoanCreate, LoanResponse,
    FinancialProfileResponse, SettlementPredictionResponse, AINegotiationCreate,
    AINegotiationResponse, AIHistoryResponse, DashboardOverview
)
from .auth import get_password_hash, verify_password, create_access_token, get_current_user
from .services.financial_engine import recalculate_financial_profile, calculate_settlement_prediction
from .services.gemini_service import generate_ai_negotiation

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.PROJECT_NAME)

# Enable CORS for frontend development
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- AUTH ENDPOINTS ---

@app.post("/api/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.Email == user_in.Email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
        
    hashed_pwd = get_password_hash(user_in.Password)
    new_user = User(
        Email=user_in.Email,
        Name=user_in.Name,
        Password=hashed_pwd,
        MonthlyIncome=0.0,
        MonthlyExpenses=0.0
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Initialize empty financial profile for the user
    new_profile = FinancialProfile(
        UserID=new_user.UserID,
        EMI_Ratio=0.0,
        DTI_Ratio=0.0,
        MonthlySurplus=0.0,
        StressLevel="Low"
    )
    db.add(new_profile)
    db.commit()
    
    return new_user


@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.Email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.Password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.Email})
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me", response_model=UserResponse)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@app.put("/api/auth/profile", response_model=UserResponse)
def update_profile(
    profile_data: UserUpdateProfile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if profile_data.Name is not None:
        current_user.Name = profile_data.Name
    if profile_data.MonthlyIncome is not None:
        current_user.MonthlyIncome = profile_data.MonthlyIncome
    if profile_data.MonthlyExpenses is not None:
        current_user.MonthlyExpenses = profile_data.MonthlyExpenses
        
    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    # Trigger recalculation of financial profile when income/expenses change
    loans = db.query(Loan).filter(Loan.UserID == current_user.UserID).all()
    recalculate_financial_profile(current_user, loans)
    db.commit()
    
    return current_user


# --- LOAN ENDPOINTS ---

@app.get("/api/loans", response_model=List[LoanResponse])
def get_user_loans(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loans = db.query(Loan).filter(Loan.UserID == current_user.UserID).all()
    return loans


@app.post("/api/loans", response_model=LoanResponse, status_code=status.HTTP_201_CREATED)
def create_loan(
    loan_in: LoanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_loan = Loan(
        UserID=current_user.UserID,
        LenderName=loan_in.LenderName,
        LoanType=loan_in.LoanType,
        OutstandingAmount=loan_in.OutstandingAmount,
        InterestRate=loan_in.InterestRate,
        EMI=loan_in.EMI,
        OverdueMonths=loan_in.OverdueMonths
    )
    db.add(new_loan)
    db.commit()
    db.refresh(new_loan)
    
    # Recalculate stress level and dashboard ratios
    loans = db.query(Loan).filter(Loan.UserID == current_user.UserID).all()
    recalculate_financial_profile(current_user, loans)
    db.commit()
    
    return new_loan


@app.put("/api/loans/{loan_id}", response_model=LoanResponse)
def update_loan(
    loan_id: int,
    loan_in: LoanCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.LoanID == loan_id, Loan.UserID == current_user.UserID).first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
        
    loan.LenderName = loan_in.LenderName
    loan.LoanType = loan_in.LoanType
    loan.OutstandingAmount = loan_in.OutstandingAmount
    loan.InterestRate = loan_in.InterestRate
    loan.EMI = loan_in.EMI
    loan.OverdueMonths = loan_in.OverdueMonths
    
    db.add(loan)
    db.commit()
    db.refresh(loan)
    
    # Recalculate dashboard ratios
    loans = db.query(Loan).filter(Loan.UserID == current_user.UserID).all()
    recalculate_financial_profile(current_user, loans)
    db.commit()
    
    return loan


@app.delete("/api/loans/{loan_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_loan(
    loan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.LoanID == loan_id, Loan.UserID == current_user.UserID).first()
    if not loan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Loan not found"
        )
        
    db.delete(loan)
    db.commit()
    
    # Recalculate dashboard ratios
    loans = db.query(Loan).filter(Loan.UserID == current_user.UserID).all()
    recalculate_financial_profile(current_user, loans)
    db.commit()
    
    return None


# --- ANALYSIS & DASHBOARD ENDPOINTS ---

@app.get("/api/analysis/profile", response_model=FinancialProfileResponse)
def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    profile = db.query(FinancialProfile).filter(FinancialProfile.UserID == current_user.UserID).first()
    if not profile:
        # Create profile if not exists
        loans = db.query(Loan).filter(Loan.UserID == current_user.UserID).all()
        profile = recalculate_financial_profile(current_user, loans)
        db.commit()
        db.refresh(profile)
    return profile


@app.get("/api/analysis/dashboard", response_model=DashboardOverview)
def get_dashboard_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    loans = db.query(Loan).filter(Loan.UserID == current_user.UserID).all()
    profile = db.query(FinancialProfile).filter(FinancialProfile.UserID == current_user.UserID).first()
    
    if not profile:
        profile = recalculate_financial_profile(current_user, loans)
        db.commit()
        db.refresh(profile)
        
    total_outstanding = sum(loan.OutstandingAmount for loan in loans)
    total_emi = sum(loan.EMI for loan in loans)
    
    return {
        "User": current_user,
        "Profile": profile,
        "Loans": loans,
        "TotalOutstanding": total_outstanding,
        "TotalEMI": total_emi,
        "MonthlySurplus": profile.MonthlySurplus
    }


@app.post("/api/analysis/predict/{loan_id}", response_model=SettlementPredictionResponse)
def predict_settlement(
    loan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.LoanID == loan_id, Loan.UserID == current_user.UserID).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    # Ensure stress levels are up-to-date
    loans = db.query(Loan).filter(Loan.UserID == current_user.UserID).all()
    recalculate_financial_profile(current_user, loans)
    db.commit()
    db.refresh(current_user)
    
    # Calculate target settlement
    prediction_result = calculate_settlement_prediction(loan, current_user)
    
    # Check if a prediction already exists for this loan and update, or create new
    prediction = db.query(SettlementPrediction).filter(SettlementPrediction.LoanID == loan_id).first()
    if prediction:
        prediction.SuggestedSettlement = prediction_result["SuggestedSettlement"]
        prediction.RiskCategory = prediction_result["RiskCategory"]
        prediction.PredictedAmount = prediction_result["PredictedAmount"]
    else:
        prediction = SettlementPrediction(
            LoanID=loan_id,
            SuggestedSettlement=prediction_result["SuggestedSettlement"],
            RiskCategory=prediction_result["RiskCategory"],
            PredictedAmount=prediction_result["PredictedAmount"]
        )
        db.add(prediction)
        
    db.commit()
    db.refresh(prediction)
    
    # Record event in general AI History
    history_entry = AIHistory(
        UserID=current_user.UserID,
        GeneratedContent=f"Suggested settlement of {prediction.SuggestedSettlement}% (${prediction.PredictedAmount}) for loan from {loan.LenderName} with Risk Category: {prediction.RiskCategory}.",
        QueryType="Settlement Prediction Review"
    )
    db.add(history_entry)
    db.commit()
    
    return prediction


@app.get("/api/analysis/predictions", response_model=List[SettlementPredictionResponse])
def get_settlement_predictions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    predictions = db.query(SettlementPrediction).join(Loan).filter(Loan.UserID == current_user.UserID).all()
    return predictions


# --- AI NEGOTIATION ENDPOINTS ---

@app.post("/api/negotiate/generate", response_model=AINegotiationResponse)
def generate_letter(
    negotiation_data: AINegotiationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    loan = db.query(Loan).filter(Loan.LoanID == negotiation_data.LoanID, Loan.UserID == current_user.UserID).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
        
    # Ensure profile is calculated
    loans = db.query(Loan).filter(Loan.UserID == current_user.UserID).all()
    recalculate_financial_profile(current_user, loans)
    db.commit()
    
    # Call AI generation service
    ai_result = generate_ai_negotiation(
        user=current_user,
        loan=loan,
        hardship_reason=negotiation_data.HardshipReason,
        proposed_settlement_percent=negotiation_data.ProposedSettlementPercent,
        additional_details=negotiation_data.AdditionalDetails
    )
    
    # Create AI Negotiation Record
    new_negotiation = AINegotiation(
        LoanID=loan.LoanID,
        UserID=current_user.UserID,
        NegotiationStrategy=ai_result["NegotiationStrategy"],
        NegotiationLetter=ai_result["NegotiationLetter"]
    )
    db.add(new_negotiation)
    
    # Record event in general AI History
    history_entry = AIHistory(
        UserID=current_user.UserID,
        GeneratedContent=f"Drafted a hardship settlement letter for {loan.LenderName}. Hardship: {negotiation_data.HardshipReason}. Proposed settlement amount: ${round(loan.OutstandingAmount * ((negotiation_data.ProposedSettlementPercent or 45.0) / 100.0), 2)}.",
        QueryType="Hardship Letter Draft"
    )
    db.add(history_entry)
    db.commit()
    db.refresh(new_negotiation)
    
    return new_negotiation


@app.get("/api/negotiate/history", response_model=List[AINegotiationResponse])
def get_negotiation_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    history = db.query(AINegotiation).filter(AINegotiation.UserID == current_user.UserID).order_by(AINegotiation.GeneratedDate.desc()).all()
    return history


@app.get("/api/negotiate/history-logs", response_model=List[AIHistoryResponse])
def get_ai_history_logs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logs = db.query(AIHistory).filter(AIHistory.UserID == current_user.UserID).order_by(AIHistory.Timestamp.desc()).all()
    return logs
