import os
import json
import logging
from ..models import User, Loan
from ..config import settings

logger = logging.getLogger(__name__)

# Initialize Gemini if API key is provided
gemini_available = False
try:
    if settings.GEMINI_API_KEY:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        gemini_available = True
        logger.info("Google Gemini API client initialized successfully.")
    else:
        logger.warning("No GEMINI_API_KEY found. Running in rule-based mock fallback mode.")
except Exception as e:
    logger.error(f"Failed to initialize Gemini API client: {e}. Falling back to rule-based generation.")

def generate_ai_negotiation(
    user: User, 
    loan: Loan, 
    hardship_reason: str, 
    proposed_settlement_percent: float = None, 
    additional_details: str = None
) -> dict:
    """
    Generates a negotiation strategy and a customized hardship letter/email
    using Google Gemini AI or a rule-based fallback.
    
    Returns a dictionary with keys:
    - "NegotiationStrategy": advice on how to approach the lender.
    - "NegotiationLetter": a ready-to-use professional letter.
    """
    outstanding = loan.OutstandingAmount
    suggested_percent = proposed_settlement_percent or 45.0
    settlement_amount = round(outstanding * (suggested_percent / 100.0), 2)
    
    # Context summary for prompt / fallback
    user_name = user.Name
    lender = loan.LenderName
    loan_type = loan.LoanType
    overdue = loan.OverdueMonths
    monthly_income = user.MonthlyIncome
    monthly_expenses = user.MonthlyExpenses
    emi = loan.EMI
    
    details_str = additional_details or "No additional information provided."

    # Construct the instruction prompt
    prompt = f"""
    You are a professional credit counseling and debt negotiation expert.
    Analyze the borrower's financial situation and generate a debt settlement proposal.
    
    Borrower Details:
    - Name: {user_name}
    - Gross Monthly Income: ${monthly_income:.2f}
    - Monthly Expenses (excluding this loan): ${monthly_expenses:.2f}
    
    Loan Details:
    - Lender: {lender}
    - Loan Type: {loan_type}
    - Outstanding Balance: ${outstanding:.2f}
    - Current Monthly Payment (EMI): ${emi:.2f}
    - Months Overdue: {overdue} months
    
    Hardship Situation:
    - Reason: {hardship_reason}
    - Additional Details: {details_str}
    
    Proposed Settlement:
    - Target Settlement: {suggested_percent}% of balance (offering ${settlement_amount:.2f} as a final settlement)
    
    Your task:
    Generate a JSON response containing two keys:
    1. "NegotiationStrategy": A bulleted list of 3-4 professional negotiation tips specific to this scenario. Focus on how the borrower should communicate, follow-up, and handle negotiations for this specific lender/loan type.
    2. "NegotiationLetter": A highly professional, polite, and persuasive formal hardship and settlement request letter/email. It must explain the financial hardship, request a settlement of the outstanding balance, propose the settlement amount of ${settlement_amount:.2f} ({suggested_percent}% of the balance), and ask for a written agreement. Do not include placeholders; write a fully drafted letter using the provided details. Use standard formal layout.
    
    Response format:
    {{
        "NegotiationStrategy": "Tip 1\\nTip 2\\nTip 3",
        "NegotiationLetter": "Dear {lender},\\n\\nI am writing to..."
    }}
    
    Return ONLY a valid JSON object. Do not include markdown code block formatting (like ```json).
    """

    if gemini_available:
        try:
            import google.generativeai as genai
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            # Request JSON output specifically
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            
            result_text = response.text.strip()
            # Clean possible markdown wrapping if Gemini ignored instructions
            if result_text.startswith("```"):
                lines = result_text.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                result_text = "\n".join(lines).strip()
                
            data = json.loads(result_text)
            if "NegotiationStrategy" in data and "NegotiationLetter" in data:
                return data
        except Exception as e:
            logger.error(f"Gemini API execution error: {e}. Falling back to rule-based generator.")
            
    # --- RULE-BASED FALLBACK GENERATION ---
    # Draft a robust, highly personalized strategy and letter using local logic
    
    # 1. Custom Strategy Tips
    strategy_tips = [
        f"Be prepared to offer the settlement as a lump sum or in at most 3 monthly installments. Unsecured lenders (like {loan_type}) prioritize speed over the full balance.",
        f"Clearly explain that your current hardship ({hardship_reason}) prevents you from paying the full outstanding balance of ${outstanding:,.2f}.",
        f"Ask for the 'Settlement Agreement' strictly in writing before sending any payments. Verbal promises are not legally binding.",
        f"If the negotiator is aggressive, remain calm, cite your monthly surplus of ${max(0.0, monthly_income - monthly_expenses - emi):,.2f}, and offer to send supporting bank statements."
    ]
    
    # 2. Hardship-specific descriptions
    hardship_descriptions = {
        "job loss": "unplanned unemployment and loss of monthly income, which has severely disrupted my ability to manage basic household utilities and credit commitments.",
        "medical issue": "unforeseen medical emergencies and substantial out-of-pocket healthcare expenses. These costs have entirely depleted my savings and left me with limited funds.",
        "divorce": "significant personal and financial restructuring due to divorce, dividing household income and creating unexpected legal and living costs.",
        "interest rate hike": "an unsustainable increase in loan interest rates and monthly living costs, which has pushed my debt-to-income ratio beyond manageable thresholds.",
        "other": "an unexpected reduction in income and a rise in living expenses that has made it impossible to sustain the full monthly payment schedule."
    }
    
    hardship_desc = hardship_descriptions.get(hardship_reason.lower(), f"financial hardship due to {hardship_reason.lower()}.")
    if additional_details and additional_details != "No additional information provided.":
        hardship_desc += f" Specifically, {additional_details.strip()}"

    # 3. Custom Letter Draft
    letter_body = f"""Date: {logging.Formatter.default_msec_format}
Subject: Hardship Settlement Proposal - Account for {user_name}

To the Settlement Department at {lender},

I am writing this letter to formally request a settlement agreement for my {loan_type} account. I am currently experiencing severe financial hardship due to {hardship_desc}

As reflected in my account status, my account is currently {overdue} months overdue. I have conducted a thorough review of my finances: my gross monthly income is ${monthly_income:,.2f}, while my essential living costs (housing, groceries, and medical needs) total ${monthly_expenses:,.2f}. After covering these absolute basic needs, I have very little surplus income remaining, making it impossible to service the regular monthly payment of ${emi:,.2f} on my balance of ${outstanding:,.2f}.

I want to resolve this obligation and avoid default. To achieve this, I have secured a one-time assistance from my family to offer a settlement. I propose a final, full settlement payment of ${settlement_amount:,.2f}, which represents {suggested_percent}% of the total outstanding balance.

I can make this payment within 14 business days of receiving your official, written approval of this settlement. Once this payment is received and processed, I request that the account be marked as "Settled" or "Paid in Full" with all credit bureaus, and that the remaining balance be fully waived and written off.

Please review my proposal. You can contact me at the email address associated with my account to discuss the next steps. I look forward to your written confirmation.

Sincerely,

{user_name}
"""

    return {
        "NegotiationStrategy": "\n".join(f"- {tip}" for tip in strategy_tips),
        "NegotiationLetter": letter_body.strip()
    }
