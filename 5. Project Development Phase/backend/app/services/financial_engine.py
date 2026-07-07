from ..models import User, Loan, FinancialProfile, SettlementPrediction
from typing import Dict, Any

def recalculate_financial_profile(user: User, loans: list[Loan]) -> FinancialProfile:
    """
    Computes/updates the financial health metrics for a user based on income, expenses, and loans.
    """
    income = user.MonthlyIncome
    expenses = user.MonthlyExpenses
    
    total_emi = sum(loan.EMI for loan in loans)
    total_outstanding = sum(loan.OutstandingAmount for loan in loans)
    
    # 1. EMI Ratio (Total monthly EMIs / Monthly Income)
    emi_ratio = total_emi / income if income > 0 else 0.0
    
    # 2. DTI Ratio (Total outstanding balance / Annual Income)
    dti_ratio = total_outstanding / (income * 12) if income > 0 else 0.0
    
    # 3. Monthly Surplus (Income - Expenses - EMIs)
    monthly_surplus = income - expenses - total_emi
    
    # 4. Stress Level Determination
    # We evaluate financial stress based on surplus, DTI, and EMI ratios
    if income == 0:
        stress_level = "Severe"
    elif monthly_surplus < 0 or emi_ratio >= 0.5 or dti_ratio >= 1.5:
        stress_level = "Severe"
    elif emi_ratio >= 0.4 or dti_ratio >= 1.0 or monthly_surplus < (0.1 * income):
        stress_level = "High"
    elif emi_ratio >= 0.2 or dti_ratio >= 0.5 or monthly_surplus < (0.3 * income):
        stress_level = "Medium"
    else:
        stress_level = "Low"
        
    profile = user.financial_profile
    if not profile:
        profile = FinancialProfile(UserID=user.UserID)
        user.financial_profile = profile
        
    profile.EMI_Ratio = round(emi_ratio, 4)
    profile.DTI_Ratio = round(dti_ratio, 4)
    profile.MonthlySurplus = round(monthly_surplus, 2)
    profile.StressLevel = stress_level
    
    return profile


def calculate_settlement_prediction(loan: Loan, user: User) -> Dict[str, Any]:
    """
    Calculates the target settlement percentage, settlement amount, and risk category
    for a specific loan based on borrower stress level, overdue months, and loan type.
    """
    # Base settlement suggestion is 70% of outstanding amount
    suggested_percent = 70.0
    
    # Adjust based on how overdue the loan is (more overdue = lower settlement offers are accepted)
    if loan.OverdueMonths >= 6:
        suggested_percent -= 25.0
    elif loan.OverdueMonths >= 3:
        suggested_percent -= 15.0
    elif loan.OverdueMonths >= 1:
        suggested_percent -= 5.0
        
    # Adjust based on borrower's financial stress level
    stress_level = "Low"
    if user.financial_profile:
        stress_level = user.financial_profile.StressLevel
        
    if stress_level == "Severe":
        suggested_percent -= 10.0
    elif stress_level == "High":
        suggested_percent -= 5.0
        
    # Adjust based on Loan Type (Unsecured loans are easier to settle for low amounts)
    loan_type_lower = loan.LoanType.lower() if loan.LoanType else ""
    if "credit" in loan_type_lower or "card" in loan_type_lower:
        suggested_percent -= 10.0
    elif "personal" in loan_type_lower or "unsecured" in loan_type_lower:
        suggested_percent -= 5.0
    elif "home" in loan_type_lower or "mortgage" in loan_type_lower or "car" in loan_type_lower or "auto" in loan_type_lower:
        # Secured debts have collateral, harder to settle
        suggested_percent += 15.0
        
    # Enforce realistic bounds (35% to 85%)
    suggested_percent = max(35.0, min(85.0, suggested_percent))
    
    # Calculate target payment amount
    predicted_amount = round(loan.OutstandingAmount * (suggested_percent / 100.0), 2)
    
    # Determine the Risk Category (risk of litigation / default charge-off)
    if loan.OverdueMonths >= 6:
        risk_category = "Severe"
    elif loan.OverdueMonths >= 3:
        risk_category = "High"
    elif loan.OverdueMonths >= 1:
        risk_category = "Medium"
    else:
        risk_category = "Low"
        
    return {
        "SuggestedSettlement": suggested_percent,
        "RiskCategory": risk_category,
        "PredictedAmount": predicted_amount
    }
