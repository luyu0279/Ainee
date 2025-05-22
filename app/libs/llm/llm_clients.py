from langchain_aws import ChatBedrockConverse
from anthropic_bedrock import AnthropicBedrock
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import OpenAI, AzureOpenAI, AzureChatOpenAI
from app import settings

# set_verbose(True)
# set_debug(True)

llm_bedrock = ChatBedrockConverse(
    model_id=settings.base_llm_model_id,
    temperature=0.1,
)
llm = ChatGoogleGenerativeAI(
    model="gemini-2.0-flash",
    temperature=0.1,
    top_p=0.2,
    timeout=60,
    max_retries=3,
    api_key=settings.google_api_key,
)

llm_image = ChatBedrockConverse(
    model_id=settings.image_llm_model_id,
    temperature=0.1
)

llm_claude_token_count = AnthropicBedrock()

# Azure OpenAI Client for Chat
llm_gpt_4o = AzureChatOpenAI(
    deployment_name=settings.gpt_model,
    api_version=settings.azure_api_version,
    api_key=settings.azure_key,
    azure_endpoint=settings.azure_endpoint,
    temperature=0.1,
)

