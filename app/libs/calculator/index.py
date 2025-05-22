import logging
import math
from datetime import datetime
from typing import Optional

import numpy as np
import numpy_financial as npf
from pydantic import BaseModel, Field

from app.libs.calculator.utils import FinancialUtils, DateUnit
from app.libs.llm.models import RefinanceCalculatorModelWithPMT

logger = logging.getLogger(__name__)


class CalculatorResult(BaseModel):
    remaining_loan_amount: float = None
    monthly_payment: float = None
    interest_rate: float = None
    months_remaining_on_loans: float = None
    interest_remaining_on_loans: float = None
    closing_cost: float = None
    total_cost: float = None


# 共享的模型，用于定义共同的参数
class DefaultCalculatorParams(BaseModel):
    loan_amount: float
    interest_rate: float
    origination_YYYYMM: str
    loan_term_in_months: Optional[float] = None
    closing_cost: Optional[float] = 0
    refinance_load_amount: Optional[float] = None
    refinance_loan_term_in_months: Optional[float] = None
    refinance_interest_rate: Optional[float] = None


class FinanceCalculator:
    def __init__(self, params: DefaultCalculatorParams, is_new_loan: bool = False):
        self.loan_amount = params.loan_amount
        self.loan_term_in_months = params.loan_term_in_months
        self.interest_rate = params.interest_rate
        self.origination_month_and_year = params.origination_YYYYMM
        self.final_value = 0.0
        self.closing_cost = params.closing_cost if params.closing_cost else 0
        self.is_new_load = is_new_loan

    def calculate(self):
        monthly_interest_rate = round(self.interest_rate / 12, 9)
        monthly_payment = -npf.pmt(
            monthly_interest_rate,
            self.loan_term_in_months,
            self.loan_amount,
        )
        month_diff = 0 if self.is_new_load else FinancialUtils.date_diff(
            datetime.strptime(self.origination_month_and_year, "%Y%m"), datetime.now(), DateUnit.M
        )
        start_period = month_diff + 1
        remaining_loan_amount = self.loan_amount + FinancialUtils.cumprinc(
            monthly_interest_rate,
            self.loan_term_in_months,
            self.loan_amount,
            1,
            month_diff,
            0
        )

        cumipmt = -FinancialUtils.cumipmt(
            monthly_interest_rate,
            start_period,
            self.loan_term_in_months,
            self.loan_amount,
            0
        )
        return CalculatorResult(
            remaining_loan_amount=math.ceil(remaining_loan_amount),
            monthly_payment=math.ceil(monthly_payment),
            interest_rate=self.interest_rate,
            months_remaining_on_loans=self.loan_term_in_months - month_diff,
            interest_remaining_on_loans=math.ceil(cumipmt),
            closing_cost=self.closing_cost,
            total_cost=math.ceil(remaining_loan_amount + cumipmt + self.closing_cost),
        )


class FinanceCalculatorWithPMT:
    def __init__(self, params: RefinanceCalculatorModelWithPMT, is_new_loan: bool = False):
        self.loan_amount = params.loanAmount
        self.interest_rate = params.interestRate
        self.present_monthly_payment = params.presentMonthlyPayment
        self.final_value = 0.0
        self.closing_cost = params.closingCost if params.closingCost else 0
        self.is_new_loan = is_new_loan
        self._loan_term_in_months = params.refinanceLoanTermInMonths

    def calculate(self):
        monthly_interest_rate = round(self.interest_rate / 12, 9)

        if self.is_new_loan:
            loan_term_in_months = self._loan_term_in_months
            monthly_payment = npf.pmt(
                monthly_interest_rate,
                loan_term_in_months,
                self.loan_amount,
            )
        else:
            monthly_payment = -self.present_monthly_payment
            loan_term_in_months = FinancialUtils.nper(monthly_interest_rate, monthly_payment, self.loan_amount)

        if math.isnan(loan_term_in_months):
            return None

        start_period = 1
        remaining_loan_amount = self.loan_amount + FinancialUtils.cumprinc(
            monthly_interest_rate,
            loan_term_in_months,
            self.loan_amount,
            1,
            0,
            0
        )

        cumipmt = -FinancialUtils.cumipmt(
            monthly_interest_rate,
            start_period,
            loan_term_in_months,
            self.loan_amount,
            0
        )

        res = CalculatorResult(
            remaining_loan_amount=math.ceil(remaining_loan_amount),
            monthly_payment=-math.ceil(monthly_payment),
            interest_rate=self.interest_rate,
            months_remaining_on_loans=loan_term_in_months,
            interest_remaining_on_loans=math.ceil(cumipmt),
            closing_cost=self.closing_cost,
            total_cost=math.ceil(remaining_loan_amount + cumipmt + self.closing_cost),
        )

        return res
