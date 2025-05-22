import aiohttp
import asyncio
from bs4 import BeautifulSoup
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional, Dict
from app.database.cached_rate_data import cached_rate_data_repository

logger = logging.getLogger(__name__)

def __get_sora_cache_key() -> str:
    """Generate cache key for SORA rates with current date"""
    date = datetime.now().strftime("%Y-%m-%d")
    return f"sg_sora_{date}"

async def __get_sora_from_cache() -> Optional[Dict[str, Decimal]]:
    """
    Retrieve SORA rates from cache or fetch from API if needed
    
    Returns:
        Dict with SORA rates or None if failed
    """
    try:
        cache_key = __get_sora_cache_key()
        cached_data = await cached_rate_data_repository.get_cached_rate_data_by_key(cache_key)
        
        if cached_data and cached_data.cache_value:
            logger.info(f"Cache hit for {cache_key}")
            return {
                k: Decimal(str(v)) for k, v in cached_data.cache_value.items()
            }
        
        # If cache miss, fetch from API
        cache_value = await __fetch_sora_from_api()
        
        if not cache_value:
            logger.warning("Failed to fetch SORA rates from API")
            return None
            
        # Store in cache
        await cached_rate_data_repository.add_cached_rate_data(
            cache_key, cache_value=cache_value
        )
        
        return {k: Decimal(str(v)) for k, v in cache_value.items()}
        
    except Exception as e:
        logger.error(f"Error getting SORA from cache: {str(e)}")
        return None

async def __fetch_sora_from_api() -> Optional[Dict[str, float]]:
    """
    Fetch SORA rates from API with retry mechanism
    
    Returns:
        Dict with SORA rates or None if all retries failed
    """
    max_retries = 3
    retry_delay = 1  # seconds
    
    for attempt in range(max_retries):
        try:
            scraper = MortgagewiseSoraScraper()
            result = await scraper.get_sora_rates()
            if result:
                return result
            
            logger.warning(f"Empty result from API on attempt {attempt + 1}")
            
        except Exception as e:
            logger.error(f"Error on attempt {attempt + 1}: {str(e)}")
            
        if attempt < max_retries - 1:
            await asyncio.sleep(retry_delay * (attempt + 1))
    
    return None

class MortgagewiseSoraScraper:
    """Scraper for Mortgagewise SORA rates"""
    
    def __init__(self):
        self.base_url = "https://www.mortgagewise.sg/"
        self.headers = {
            'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'accept-language': 'en,en-GB;q=0.9,zh;q=0.8,zh-HK;q=0.7,zh-TW;q=0.6,ja;q=0.5,zh-CN;q=0.4',
            'cache-control': 'max-age=0',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
        }
        self.timeout = aiohttp.ClientTimeout(total=10)  # 10 seconds timeout

    async def get_sora_rates(self) -> Optional[Dict[str, float]]:
        """
        Scrape SORA rates from website
        
        Returns:
            Dict containing SORA rates or None if scraping failed
        """
        try:
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.get(self.base_url, headers=self.headers) as response:
                    response.raise_for_status()
                    html = await response.text()
                    
                    return await self.__parse_sora_rates(html)
                    
        except aiohttp.ClientError as e:
            logger.error(f"Network error fetching SORA rates: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error fetching SORA rates: {str(e)}")
            return None

    async def __parse_sora_rates(self, html: str) -> Optional[Dict[str, float]]:
        """Parse HTML content to extract SORA rates"""
        try:
            soup = BeautifulSoup(html, 'html.parser')
            table = soup.find('table', class_='avia-table')
            
            if not table:
                logger.error("SORA rates table not found in HTML")
                return None
            
            # Map headers to structured keys
            header_mapping = {
                '1-Month SORA': 'one_month',
                '3-Month SORA': 'three_month'
            }
            
            rates = {}
            headers = [th.text.strip() for th in table.find_all('th')]
            values = [td.text.strip() for td in table.find_all('td')]
            
            if not headers or not values or len(headers) != len(values):
                logger.error("Invalid table structure")
                return None
            
            # Combine headers with values using structured keys
            for header, value in zip(headers, values):
                key = header_mapping.get(header)
                if key:
                    try:
                        rates[key] = float(value)
                    except ValueError:
                        logger.error(f"Invalid rate value: {value} for {header}")
                        return None
            
            # Validate required rates are present
            if not all(key in rates for key in header_mapping.values()):
                logger.error("Missing required SORA rates")
                return None
            
            return rates
                
        except Exception as e:
            logger.error(f"Error parsing SORA rates: {str(e)}")
            return None

async def get_latest_sora() -> Optional[Dict[str, Decimal]]:
    """
    Get latest SORA rates, first trying from cache, then from API if needed
    
    Returns:
        Dict containing SORA rates with Decimal values or None if failed
    """
    return await __get_sora_from_cache()


