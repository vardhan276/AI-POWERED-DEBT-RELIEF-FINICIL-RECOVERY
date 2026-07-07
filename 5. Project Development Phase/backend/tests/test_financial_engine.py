import pytest
from app.models import User, Loan, FinancialProfile
from app.services.financial_engine import recalculate_financial_profile, calculate_settlement_prediction

def test_recalculate_financial_profile_low_stress():
    # User with high income, low expenses, and a small loan
    user = User(
        UserID=1,
        Name="John Doe",
        Email="john@example.com",
        MonthlyIncome=10000.0,
        MonthlyExpenses=2000.0,
        financial_profile=None
    )
    
    loans = [
        Loan(
            LoanID=1,
            UserID=1,
            LenderName="Lender A",
            LoanType="Personal Loan",
            OutstandingAmount=12000.0,
            EMI=500.0,
            OverdueMonths=0
        )
    ]
    
    profile = recalculate_financial_profile(user, loans)
    
    assert profile.EMI_Ratio == 0.05  # 500 / 10000
    assert profile.DTI_Ratio == 0.10  # 12000 / (10000 * 12)
    assert profile.MonthlySurplus == 7500.0  # 10000 - 2000 - 500
    assert profile.StressLevel == "Low"


def test_recalculate_financial_profile_severe_stress():
    # User with negative surplus income
    user = User(
        UserID=2,
        Name="Jane Doe",
        Email="jane@example.com",
        MonthlyIncome=3000.0,
        MonthlyExpenses=2500.0,
        financial_profile=None
    )
    
    loans = [
        Loan(
            LoanID=2,
            UserID=2,
            LenderName="Bank B",
            LoanType="Credit Card",
            OutstandingAmount=15000.0,
            EMI=600.0,
            OverdueMonths=3
        )
    ]
    
    profile = recalculate_financial_profile(user, loans)
    
    # surplus is 3000 - 2500 - 600 = -100
    assert profile.MonthlySurplus == -100.0
    assert profile.StressLevel == "Severe"


def test_calculate_settlement_prediction_unsecured_overdue():
    user = User(
        UserID=1,
        MonthlyIncome=4000.0,
        MonthlyExpenses=3000.0,
        financial_profile=None
    )
    
    # Establish a financial profile first
    user.financial_profile = FinancialProfile(
        UserID=1,
        EMI_Ratio=0.15,
        DTI_Ratio=0.5,
        MonthlySurplus=400.0,
        StressLevel="High"
    )
    
    # Overdue unsecured credit card (more willing to settle)
    loan = Loan(
        LoanID=1,
        UserID=1,
        LenderName="Apex Card",
        LoanType="Credit Card",
        OutstandingAmount=10000.0,
        InterestRate=22.0,
        EMI=600.0,
        OverdueMonths=6
    )
    
    prediction = calculate_settlement_prediction(loan, user)
    
    # Base: 70%
    # Overdue >= 6 months: -25% => 45%
    # High Stress: -5% => 40%
    # Credit Card (unsecured): -10% => 30%
    # Minimum capped floor: 35%
    assert prediction["SuggestedSettlement"] == 35.0
    assert prediction["PredictedAmount"] == 3500.0
    assert prediction["RiskCategory"] == "Severe"


def test_calculate_settlement_prediction_secured_active():
    user = User(
        UserID=1,
        MonthlyIncome=5000.0,
        MonthlyExpenses=2000.0,
        financial_profile=None
    )
    
    user.financial_profile = FinancialProfile(
        UserID=1,
        EMI_Ratio=0.2,
        DTI_Ratio=0.5,
        MonthlySurplus=2000.0,
        StressLevel="Low"
    )
    
    # Secured active mortgage loan (hard to settle)
    loan = Loan(
        LoanID=2,
        UserID=1,
        LenderName="Home Bank",
        LoanType="Mortgage",
        OutstandingAmount=100000.0,
        InterestRate=5.0,
        EMI=1000.0,
        OverdueMonths=0
    )
    
    prediction = calculate_settlement_prediction(loan, user)
    
    # Base: 70%
    # Overdue 0: no adjustment
    # Low Stress: no adjustment
    # Mortgage (secured): +15% => 85%
    assert prediction["SuggestedSettlement"] == 85.0
    assert prediction["PredictedAmount"] == 85000.0
    assert prediction["RiskCategory"] == "Low"
