import json
from typing import Optional, Dict, Any

from pydantic import BaseModel, Field


class CompletionToolsRequest(BaseModel):
    msg_id: str = Field(
        ...,
        example="123456"
    )
    message: str = Field(
        ...,
        example="hello world"
    )
    session_id: Optional[str] = Field(description="Session ID", default=None)
    upload_id: Optional[str] = Field(description="Upload ID", default=None)


class RefinanceCalculatorModelWithPMT(BaseModel):
    loanAmount: Optional[float] = Field(description="Principal amount (e.g. 300000)", default=None)
    interestRate: Optional[float] = Field(description="Annual rate as decimal (e.g. 0.07)", default=None)
    presentMonthlyPayment: Optional[float] = Field(description="Present monthly payment (e.g. 4000)", default=None)
    refinanceLoanAmount: Optional[float] = Field(description="Refinance loan amount (e.g. 300000)", default=None)
    refinanceLoanTermInMonths: Optional[float] = Field(description="Refinance loan term in months", default=None)
    refinanceInterestRate: Optional[float] = Field(description="Refinance interest rate as decimal (e.g. 0.07)", default=None)
    closingCost: Optional[float] = Field(description="Closing cost (e.g. 3000)", default=0)


class AgentCompletionResponse(BaseModel):
    msg_id: Optional[str] = Field(description="Message ID", default=None)
    event_type: Optional[str] = Field(description="Event type", default=None)
    follow_up_question: Optional[list[str]] = Field(description="Follow up questions", default=None)
    widget_name: Optional[str] = Field(description="Widget name", default=None)
    widget_url: Optional[str] = Field(description="Widget URL", default=None)
    text: Optional[str] = Field(description="Text", default=None)
    tool: Optional[Dict[str, Any]] = Field(description="Tools", default=None)
    error_code: Optional[str] = Field(description="Error code", default=None)
    tool_name: Optional[str] = Field(description="Tool name", default=None)
    event_display_message: Optional[str] = Field(description="Tool display message", default=None)

    def to_json(self):
        # 创建一个字典，过滤掉值为 None 的字段
        filtered_dict = {k: v for k, v in self.dict().items() if v is not None}
        return json.dumps(filtered_dict, ensure_ascii=False)
