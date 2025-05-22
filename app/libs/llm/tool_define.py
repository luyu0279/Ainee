import base64
import json
import logging
from typing import Optional

import requests
from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from pydantic import Field, BaseModel

# from app.api.tools.index import calculator_handler, calculator_with_pmt_handler
# from app.api.tools.index import calculator_handler, calculator_with_pmt_handler
from app.common import image_url_resize_and_to_base64
from app.context import context_user
from app.libs.calculator.index import CalculatorResult, DefaultCalculatorParams, FinanceCalculatorWithPMT
from app.libs.icanbuy.index import us_get_mortgage_rate_trend_by_score_and_state
from app.libs.llm.llm_clients import llm, llm_image
from app.libs.llm.models import RefinanceCalculatorModelWithPMT
from app.libs.mortgagewise.index import sg_get_rate_today_data
from app.libs.mortgagewise.sora import get_latest_sora

logger = logging.getLogger(__name__)


class AddInput(BaseModel):
    a: int = Field(description="first number")
    b: int = Field(description="second number", default=0)


class RefinanceCalculatorWithOriginationYYYYMMModel(BaseModel):
    loanAmount: Optional[float] = Field(
        description="Principal amount (e.g. 300000)", default=None
    )
    loanTermInMonths: Optional[float] = Field(
        description="Loan term in months", default=None
    )
    interestRate: Optional[float] = Field(
        description="Annual rate as decimal (e.g. 0.07)", default=None
    )
    originationYyyymm: Optional[str] = Field(
        description="Start date in YYYYMM format", default=None
    )
    refinanceInterestRate: Optional[float] = Field(
        description="Refinance interest rate as decimal (e.g. 0.07)", default=None
    )
    closingCost: Optional[float] = Field(
        description="Closing cost (e.g. 3000)", default=0
    )
    refinanceLoanAmount: Optional[float] = Field(
        description="Refinance loan amount (e.g. 300000)", default=None
    )
    refinanceLoanTermInMonths: Optional[float] = Field(
        description="Refinance loan term in months", default=None
    )

class RefinanceCalculatorResponse(BaseModel):
    original_loan: Optional[CalculatorResult]
    new_loan: Optional[CalculatorResult]
    report: Optional[str]

    def to_json(self):
        return json.dumps(self, default=lambda o: o.__dict__, ensure_ascii=False)


def report_generator(original_data: CalculatorResult, new_data: CalculatorResult):
    # original_data = data.original_data
    # new_data = data.new_data
    total_saved_money = original_data.total_cost - new_data.total_cost
    saved_loan_terms = original_data.months_remaining_on_loans - new_data.months_remaining_on_loans
    monthly_payment_saving = original_data.monthly_payment - new_data.monthly_payment
    cash_out = original_data.remaining_loan_amount - new_data.remaining_loan_amount
    saved_interest = original_data.interest_remaining_on_loans - new_data.interest_remaining_on_loans

    if saved_interest != 0 and new_data.months_remaining_on_loans != 0:
        breakevent_point = math.ceil(new_data.closing_cost / (saved_interest / new_data.months_remaining_on_loans))
    else:
        # Handle the case where the division would result in zero
        breakevent_point = 0

    is_recommended_text = ""
    recommendation_star = ""
    summary_text = ""
    lower_mortgage_cost = ""
    breakpoint_text = ""
    reduce_monthly_repayment_pressure_text = ""
    shorten_loan_term = ""
    access_home_equity = ""
    special_notes = ""

    is_costs_lower = "lower" if total_saved_money >= 0 else "higher"
    is_monthly_payment_lower = "lower" if monthly_payment_saving >= 0 else "higher"
    is_term_shorter = "shorter" if saved_loan_terms >= 0 else "longer"

    if total_saved_money >= 50:
        is_recommended_text = "##Yes, refinancing is a smart move."

        if 50 <= total_saved_money < 1000:
            recommendation_star = "✨"
        elif 1000 <= total_saved_money < 3000:
            recommendation_star = "✨✨"
        elif 3000 <= total_saved_money < 5000:
            recommendation_star = "✨✨✨"
        elif 5000 <= total_saved_money < 10000:
            recommendation_star = "✨✨✨✨"
        elif total_saved_money >= 10000:
            recommendation_star = "✨✨✨✨✨"

        summary_text = " ".join([
            "Overall, this refinancing can achieve a money-saving strategy.By refinancing,",
            f"your total mortgage costs will be {is_costs_lower}, your monthly payment will be {is_monthly_payment_lower}",
            f", and the new loan term will be {is_term_shorter}."
        ])
    elif True in {
        (total_saved_money < 50) and (monthly_payment_saving > 0),
        (total_saved_money < 50) and (saved_loan_terms > 0),
        (total_saved_money < 50) and (cash_out > 5000)
    }:
        is_recommended_text = "It depends."
        recommendation_star = "✨✨✨"

        purpose = ""
        if monthly_payment_saving > 0:
            purpose = "Reduce the monthly payment pressure, "

        if saved_loan_terms > 0:
            purpose = f"{purpose}to shorten your loan term, "

        if cash_out > 5000:
            purpose = f"{purpose}access  your home equity"

        summary_text = " ".join([
            f"You can opt for this refinancing only if your want {purpose}.",
            f"By refinancing, your total mortgage costs will be {is_costs_lower}, your monthly payment will be {is_monthly_payment_lower},",
            f"and the new loan term will be {is_term_shorter}."
        ])
    else:
        is_recommended_text = "No, refinancing doesn’t seem like a wise choice."
        recommendation_star = "✨"  # 半个星星
        summary_text = " ".join([
            "Overall, this  refinancing doesn't seem like a wise choice.By refinancing,",
            f"your total mortgage costs will be {is_costs_lower},",
            f"your monthly payment will be {is_monthly_payment_lower},",
            f"and the new loan term will be {is_term_shorter}."
        ])

    lower_mortgage_cost = " ".join([
        "\n### Can refinancing lower mortgage costs?\n",
        f"By refinancing, Your total mortgage costs will be {is_costs_lower}.",
        f"Your new estimated total cost will be US${new_data.total_cost} which is US${total_saved_money} {is_costs_lower} compared to your current remaining cost of your loan.",
        "Please also pay attention to the timing of your home sale."
    ])

    # breakpoint_text

    if breakevent_point > 0:
        breakpoint_text = " ".join([
            f"The breakeven will be {breakevent_point}. ",
            f"Your breakeven point is when your cumulative monthly savings equal the closing cost of refinancing.",
            f"With your monthly savings of US${monthly_payment_saving}/month, ",
            f"it would take {breakevent_point} before your closing costs of US${new_data.closing_cost} is covered."
        ])

    reduce_monthly_repayment_pressure_text = " ".join([
        "\n### Can refinancing reduce monthly repayment pressure?\n",
        f"Your new estimated monthly payment will be US${new_data.monthly_payment} which is US${monthly_payment_saving}",
        f"{is_monthly_payment_lower} compared to your current monthly payment."
        "Please keep in mind that sometimes a longer repayment period and lower",
        "monthly payments can lead to higher total interest costs."
    ])

    # shorten_loan_term

    if saved_loan_terms > 0:
        shorten_loan_term = " ".join([
            "\n### Can refinancing shorten loan term?\n",
            f"Your new loan term will be {new_data.months_remaining_on_loans},",
            f"which is {saved_loan_terms} {is_term_shorter} compared to your current mortgage."
            "You can adjust the length of your loan term through refinancing.",
            "For example, extending the term from 15 to 30 years will lower monthly payments,"
            "but shortening the term will reduce the total interest paid over time."
        ])

    # access_home_equity

    if cash_out > 0:
        access_home_equity = " ".join([
            "\n### Can refinancing access home equity?\n",
            f"By refinancing,you can cash out US${cash_out}.",
            f"Refinancing can allow you to tap into your home’s equity through a cash-out.",
            "You can use the extra cash for home improvements, debt consolidation, or pay off other high-interest debt.",
            "However, this increases the overall loan amount."
        ])

    special_notes = " ".join([
        f"\n### Please check to see how refinancing\n",
        "could impact your credit score.To avoid negatively impacting",
        "your credit score when applying to multiple lenders for auto loan refinancing,",
        "you can follow these strategies: \n\n",
        "Use the Rate-Shopping Window Credit scoring models like FICO and VantageScore",
        "allow consumers to shop for the best",
        "auto refinance rates without damaging their credit score, as long as all credit inquiries happen",
        "within a short period—typically 14 to 45 days depending on the scoring model.",
        "\n###Please check if refinancing could remove private mortgage insurance.\n",
        "If your home has increased in value or you've paid down enough of your loan, refinancing could",
        "allow you to remove the private mortgage insurance(PMI),",
        "potentially saving you a significant amount of money.",
        "\n###Please check if your loan agreement has a prepayment penalty.\n",
        "Beware of Fees and Prepayment Penalties. Check if your current loan has any prepayment penalties.",
        "Some auto loans charge fees for paying off the loan early, which could reduce the benefits of refinancing."
    ])

    return "".join([
        "IMPORTANT NOTE: Please summarize and provide only the most critical and concise information to the user, placing the important conclusions at the beginning. If the user asks for more details, you can explain gradually.\n\n ",
        "Following is the detailed report of the refinancing:\n\n",
        is_recommended_text,
        f"\nRecommended Level: {recommendation_star}\n\n",
        summary_text,
        lower_mortgage_cost,
        breakpoint_text,
        reduce_monthly_repayment_pressure_text,
        shorten_loan_term,
        access_home_equity,
        special_notes
    ])



def calculator_with_pmt_handler(calculator_request: RefinanceCalculatorModelWithPMT) -> RefinanceCalculatorResponse:
    origin_params = calculator_request.copy()
    new_params = calculator_request.copy()

    origin_params.closingCost = 0
    original_data = FinanceCalculatorWithPMT(origin_params).calculate()
    new_params.loanAmount = origin_params.refinanceLoanAmount \
        if origin_params.refinanceLoanAmount else original_data.remaining_loan_amount
    new_params.interestRate = new_params.refinanceInterestRate \
        if new_params.refinanceInterestRate else origin_params.interestRate
    new_params.refinanceLoanTermInMonths = origin_params.refinanceLoanTermInMonths \
        if origin_params.refinanceLoanTermInMonths else original_data.months_remaining_on_loans
    new_data = FinanceCalculatorWithPMT(new_params, True).calculate()

    res = RefinanceCalculatorResponse(
        original_loan=original_data,
        new_loan=new_data,
        report=None
    )

    if res.original_loan and res.new_loan:
        res.report = report_generator(res.original_loan, res.new_loan)

    return res



@tool(
    "mortgage_refinance_calculator_with_origination",
    args_schema=RefinanceCalculatorWithOriginationYYYYMMModel,
)
def refinance_calculator_with_origination_YYYYMM(
    loanAmount: Optional[float] = None,
    loanTermInMonths: Optional[float] = None,
    interestRate: Optional[float] = None,
    originationYyyymm: Optional[str] = None,
    refinanceInterestRate: Optional[float] = None,
    closingCost: Optional[float] = None,
    refinanceLoanAmount: Optional[float] = None,
    refinanceLoanTermInMonths: Optional[float] = None,
):
    """
    MORTGAGE REFINANCE ONLY.
    Use quick_get_mortgage_refinance_info_from_user to ask data, when lack of parameters.
    Mortgage refinancing calculator with loan_amount, loan_term_in_months, interest_rate, origination_YYYYMM, refinance_interest_rate
    """
    losing_params_str = ""

    if loanAmount is None:
        losing_params_str += "loan_amount, "

    if loanTermInMonths is None:
        losing_params_str += "loan_term_in_months, "

    if interestRate is None:
        losing_params_str += "interest_rate, "

    if originationYyyymm is None:
        losing_params_str += "origination_YYYYMM, "

    if refinanceInterestRate is None:
        losing_params_str += "refinance_interest_rate, "

    if losing_params_str != "":
        return f"Missing required parameters: {losing_params_str}"

    return calculator_handler(
        DefaultCalculatorParams(
            loan_amount=loanAmount,
            loan_term_in_months=loanTermInMonths,
            interest_rate=interestRate,
            origination_YYYYMM=originationYyyymm,
            closing_cost=closingCost,
            refinance_interest_rate=refinanceInterestRate,
            refinance_load_amount=refinanceLoanAmount,
            refinance_loan_term_in_months=refinanceLoanTermInMonths,
        )
    )


@tool(
    "mortgage_refinance_calculator_with_pmt",
    args_schema=RefinanceCalculatorModelWithPMT,
)
def refinance_calculator_with_pmt(
    loanAmount: Optional[float] = None,
    interestRate: Optional[float] = None,
    presentMonthlyPayment: Optional[float] = None,
    refinanceLoanAmount: Optional[float] = None,
    refinanceLoanTermInMonths: Optional[float] = None,
    refinanceInterestRate: Optional[float] = None,
    closingCost: Optional[float] = None,
):
    """
    MORTGAGE REFINANCE ONLY.
    Use quick_get_mortgage_refinance_info_from_user to ask data, when lack of parameters.
    Note: pmt is for present monthly payment.
    Mortgage refinancing calculator with loan_amount, interest_rate, present_monthly_payment, refinance_interest_rate
    """
    losing_params_str = ""

    if loanAmount is None:
        losing_params_str += "loan_amount, "

    if interestRate is None:
        losing_params_str += "interest_rate, "

    if presentMonthlyPayment is None:
        losing_params_str += "present_monthly_payment, "

    if refinanceInterestRate is None:
        losing_params_str += "refinance_interest_rate, "

    if losing_params_str != "":
        return f"Missing required parameters: {losing_params_str}"

    return calculator_with_pmt_handler(
        RefinanceCalculatorModelWithPMT(
            loanAmount=loanAmount,
            interestRate=interestRate,
            presentMonthlyPayment=presentMonthlyPayment,
            refinanceLoanAmount=refinanceLoanAmount,
            refinanceLoanTermInMonths=refinanceLoanTermInMonths,
            refinanceInterestRate=refinanceInterestRate,
            closingCost=closingCost,
        )
    )


class StateEnum(str):
    national = "National"
    alabama = "Alabama"
    alaska = "Alaska"
    arizona = "Arizona"
    arkansas = "Arkansas"
    california = "California"
    colorado = "Colorado"
    connecticut = "Connecticut"
    delaware = "Delaware"
    district_of_columbia = "District of Columbia"
    florida = "Florida"
    georgia = "Georgia"
    hawaii = "Hawaii"
    idaho = "Idaho"
    illinois = "Illinois"
    indiana = "Indiana"
    iowa = "Iowa"
    kansas = "Kansas"
    kentucky = "Kentucky"
    louisiana = "Louisiana"
    maine = "Maine"
    maryland = "Maryland"
    massachusetts = "Massachusetts"
    michigan = "Michigan"
    minnesota = "Minnesota"
    mississippi = "Mississippi"
    missouri = "Missouri"
    montana = "Montana"
    nebraska = "Nebraska"
    nevada = "Nevada"
    new_hampshire = "New Hampshire"
    new_jersey = "New Jersey"
    new_mexico = "New Mexico"
    new_york = "New York"
    north_carolina = "North Carolina"
    north_dakota = "North Dakota"
    ohio = "Ohio"
    oklahoma = "Oklahoma"
    oregon = "Oregon"
    pennsylvania = "Pennsylvania"
    rhode_island = "Rhode Island"
    south_carolina = "South Carolina"
    south_dakota = "South Dakota"
    tennessee = "Tennessee"
    texas = "Texas"
    utah = "Utah"
    vermont = "Vermont"
    virginia = "Virginia"
    washington = "Washington"
    west_virginia = "West Virginia"
    wisconsin = "Wisconsin"
    wyoming = "Wyoming"


class GetStateMortgageRateTrendModel(BaseModel):
    state: Optional[str] = Field(
        description="States mortgage rate trend， eg.Alabama, California, or national",
        default="National",
    )
    creditScore: Optional[float] = Field(
        description="Credit score, from 300 to 850, default can be 600", default=640
    )


@tool("get_state_mortgage_rate_trend_c1", args_schema=GetStateMortgageRateTrendModel)
async def usa_get_state_mortgage_rate_trend(
    state: Optional[str], creditScore: Optional[float]
):
    """
    Get state mortgage rate trend. In general, credit score is above 620...
    """
    empty_input_warning = ""

    if not state:  # `state` 为空字符串或 `None` 都会返回 False
        empty_input_warning += "state"

    if creditScore is None or creditScore == "":
        empty_input_warning += ", creditScore"

    if empty_input_warning:
        return f"Missing required parameters: {empty_input_warning}"

    return await us_get_mortgage_rate_trend_by_score_and_state(state, creditScore)


class GetStateMortgageRateTrendModelSG(BaseModel):
    propertyType: Optional[str] = Field(
        description="Property type. There are two options — HDB and Private Residential Property."
    )
    loanRateType: Optional[str] = Field(
        description="Loan type. There are two options —  fixed and floating"
    )
    preferredBank: Optional[str] = Field(description="Preferred bank name")


@tool("get_state_mortgage_rate_trend_c2", args_schema=GetStateMortgageRateTrendModelSG)
async def sgp_get_state_mortgage_rate_trend(
    propertyType: Optional[str],
    loanRateType: Optional[str],
    preferredBank: Optional[str],
):
    """
    Get singapore mortgage rate trend
    args: propertyType, loanRateType
    propertyType:
        Property type. There are two options — HDB and Private Residential Property.
        When the user inputs something like "HDB," please convert it to the string "3." When the user inputs something
        like "Private Residential Property," please convert it to the string "1."
    loanRateType:
        Loan rate type. There are two options — fixed and floating. When the user inputs something like "fixed," please
        convert it to the string "fixed." When the user inputs something like "floating," please convert it to the string
        "floating."
    """
    empty_input_warning = ""

    if not propertyType:
        empty_input_warning += "propertyType"

    if not loanRateType:
        empty_input_warning += ", loanType"

    if empty_input_warning:
        return f"Missing required parameters: {empty_input_warning}"

    return await sg_get_rate_today_data(propertyType, loanRateType)


@tool("quick_get_mortgage_refinance_info_from_user")
async def quick_get_refinance_info_from_user() -> str:
    """
    MORTGAGE REFINANCE ONLY.
    Always use this to collect mortgage financial info from user, When a user wants to perform a mortgage refinance calculation, cost estimation, and so on..

    Use this tool when:
    - User wants to calculate refinance options
    - Need to gather loan details like current rate, new rate, loan amount
    - Need to collect mortgage refinancing parameters
    - User asks about refinance closing costs
    - User needs to estimate loan-related fees
    - User wants to calculate total refinancing expenses

    Input: None required
    Output: Returns a prompt for user to provide refinance details

    Example trigger phrases:
    - "I want to calculate refinance options"
    - "Need to compare refinance rates"
    - "Help me with refinance calculations"
    - "Can you estimate my closing costs?"
    - "can you help me to do refinance calculate?"
    - "How much would it cost to refinance?"
    - "What fees do I need to pay for refinancing?"
    - "Calculate the costs based on my loan amount"
    - "Help me estimate refinance expenses"
    - "What would be the total cost to refinance?"
    """
    return """The form is ready for you to fill out"""


@tool("quick_get_rate_query_info_from_user_sgp")
async def sgp_quick_get_rate_query_info_from_user() -> str:
    """
    MORTGAGE RATE QUERY ONLY.
    Always use this to collect information when user wants to check mortgage rates.

    Ask following data:
    Property type: HDB or Private Residential Property
    Loan rate type: Fixed or Floating
    Preferred bank: Bank name

    Use this tool when:
    - User wants to check current mortgage rates
    - Need to gather location and credit score info for rate lookup
    - User asks about available mortgage rates
    """
    return """The form is ready for you to fill out"""


@tool("quick_get_rate_query_info_from_user_usa")
async def usa_quick_get_rate_query_info_from_user() -> str:
    """
    MORTGAGE RATE QUERY ONLY.
    Always use this to collect information when user wants to check mortgage rates.

    Ask following data:
    Credit score: 300 to 850
    State: State name

    Use this tool when:
    - User wants to check current mortgage rates
    - Need to gather location and credit score info for rate lookup
    - User asks about available mortgage rates
    """
    return """The form is ready for you to fill out"""


@tool("read_image")
async def read_image(imageUrl: str):
    """
    when user send an image, use this tool to read the image
    Input: image_url
    Output: image content
    """
    base64_image = await image_url_resize_and_to_base64(imageUrl)

    if base64_image is None:
        return "Failed to read the image"

    message = HumanMessage(
        content=[
            {
                "type": "text",
                "text": "Please extract as much information as possible from this image.",
            },
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"},
            },
        ],
    )

    # Invoke the model with the message
    response = await llm_image.ainvoke([message])
    return f"""
      IMAGE CAPTION: {response.content[0].get('text')}
    """


class SoraRateQueryModel(BaseModel):
    rate_type: Optional[str] = Field(
        description="Rate type (e.g. '1M-SORA', '3M-SORA').",
        pattern="^(1M-SORA|3M-SORA)$",
    )


@tool("query_sora_rate", args_schema=SoraRateQueryModel)
async def query_sora_rate(rate_type: Optional[str]):
    """
    Query the latest rates for SORA (Singapore Overnight Rate Average) based on the specified rate type.

    SORA (Singapore Overnight Rate Average) is the volume-weighted average rate of unsecured overnight interbank SGD transactions in Singapore.

    Input format conversion rules:
    - For 1-month SORA rates: Convert inputs like "1 month", "1m", "one month" to "1M-SORA"
    - For 3-month SORA rates: Convert inputs like "3 months", "3m", "three months" to "3M-SORA"
    """
    sora = await get_latest_sora()

    if rate_type == "1M-SORA":
        return sora["one_month"]
    elif rate_type == "3M-SORA":
        return sora["three_month"]

    return sora


agent_tools = [
    quick_get_refinance_info_from_user,
    refinance_calculator_with_pmt,
    refinance_calculator_with_origination_YYYYMM,
    read_image,
]


def get_available_tools():
    country = context_user.get().self_set_country

    new_agent_tools = agent_tools.copy()

    if country == AcceptedCountryCode.SGP:
        new_agent_tools.append(sgp_get_state_mortgage_rate_trend)
        new_agent_tools.append(query_sora_rate)
        new_agent_tools.append(sgp_quick_get_rate_query_info_from_user)
    else:
        new_agent_tools.append(usa_get_state_mortgage_rate_trend)
        new_agent_tools.append(usa_quick_get_rate_query_info_from_user)

    return new_agent_tools


def get_tool_display_name(tool_name):
    if tool_name == quick_get_refinance_info_from_user.name:
        return "Prepare quick fill form"
    elif tool_name == refinance_calculator_with_pmt.name:
        return "Refinance Calculator"
    elif tool_name == refinance_calculator_with_origination_YYYYMM.name:
        return "Refinance Calculator"
    elif tool_name == read_image.name:
        return "Read Image"
    elif tool_name == sgp_get_state_mortgage_rate_trend.name:
        return "Get State Mortgage Rate Trend"
    elif tool_name == usa_get_state_mortgage_rate_trend.name:
        return "Get State Mortgage Rate Trend"
    elif tool_name == query_sora_rate.name:
        return "Query SORA Rate"
    elif tool_name == sgp_quick_get_rate_query_info_from_user.name:
        return "Get Rate Query Info"
    elif tool_name == usa_quick_get_rate_query_info_from_user.name:
        return "Get Rate Query Info"

    return ""
