import json
import logging
from typing import TypeVar, Optional, Any
from app.common import retry_async, extract_json
from app.libs.llm.llm_clients import llm

logger = logging.getLogger(__name__)

T = TypeVar('T')

@retry_async(max_attempts=3, base_delay=1)
async def invoke_llm_with_structured_output(prompt: str, output_type: Optional[T] = None) -> Any:
    """
    Invoke LLM with retry and parse the response as structured output.
    
    Args:
        prompt: The prompt to send to the LLM
        output_type: Optional Pydantic model type for response validation
    
    Returns:
        Parsed JSON response, optionally validated against output_type
    
    Raises:
        ValueError: If JSON parsing fails
        ValidationError: If output_type validation fails
    """
    try:
        # Call LLM
        res = await llm.ainvoke(prompt)
        
        # Extract and parse JSON from response
        json_str = extract_json(res.content)
        result = json.loads(json_str)
        
        # Validate against output type if provided
        if output_type is not None:
            return output_type(**result)
        
        return result
    
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse LLM response as JSON: {str(e)}")
        raise ValueError(f"Invalid JSON response from LLM: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error in LLM invocation: {str(e)}")
        raise 