import json
import logging
import math
import time
import urllib.parse
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

import aiohttp
import requests
from pydantic import BaseModel

from app.database.cached_rate_data import cached_rate_data_repository

logger = logging.getLogger(__name__)

state_value = {
    "national": "US",
    "alabama": "AL",
    "alaska": "AK",
    "arizona": "AZ",
    "arkansas": "AR",
    "california": "CA",
    "colorado": "CO",
    "connecticut": "CT",
    "delaware": "DE",
    "district_of columbia": "DC",
    "florida": "FL",
    "georgia": "GA",
    "hawaii": "HI",
    "idaho": "ID",
    "illinois": "IL",
    "indiana": "IN",
    "iowa": "IA",
    "kansas": "KS",
    "kentucky": "KY",
    "louisiana": "LA",
    "maine": "ME",
    "maryland": "MD",
    "massachusetts": "MA",
    "michigan": "MI",
    "minnesota": "MN",
    "mississippi": "MS",
    "missouri": "MO",
    "montana": "MT",
    "nebraska": "NE",
    "nevada": "NV",
    "new_hampshire": "NH",
    "new_jersey": "NJ",
    "new_mexico": "NM",
    "new_york": "NY",
    "north_carolina": "NC",
    "north_dakota": "ND",
    "ohio": "OH",
    "oklahoma": "OK",
    "oregon": "OR",
    "pennsylvania": "PA",
    "rhode_island": "RI",
    "south_carolina": "SC",
    "south_dakota": "SD",
    "tennessee": "TN",
    "texas": "TX",
    "utah": "UT",
    "vermont": "VT",
    "virginia": "VA",
    "washington": "WA",
    "west_virginia": "WV",
    "wisconsin": "WI",
    "wyoming": "WY"
}


def call_api_2(fico, ltv, loan, zip_code):
    url = f"https://mortgagerates.icanbuy.com/api/search?external=&cashout=0&fico={fico}&include_text_results=1&loan={loan}&ltv={ltv}&mobile_sites=0&occupancy=49&period=PERIOD_FIXED_30YEARS&points=1&property_type=34&rate_lock=99&show_fha=0&show_usda=0&siteid=d0951c6cf9bb747a&specs=&state=&transaction=54&type=json&valoans=0&zip={zip_code}&callback=jQuery191026359347619062423_1729047853292"
    response = requests.get(url)
    return response.json()  # 假设返回的是 JSON 格式


def get_state_id_by_name(name):
    name = state_value.get(name.lower().replace(" ", "_"))
    logger.info(f"get state id by name: {name}")
    if not name:
        return state_value.get("National")

    return name


def __get_rate_cache_key(state_id, credit_score, product_id):
    date = datetime.now().strftime("%Y-%m-%d")
    return f"{product_id}{state_id}_{credit_score}_{date}"


async def __get_rate_today_cached_data(state_id, credit_score, product_id):
    try:
        cache_key = __get_rate_cache_key(state_id, credit_score, product_id)
        logger.info(f"get rate with rate cache key: {cache_key}")
        # 尝试从数据库中获取缓存数据
        cached_data = await cached_rate_data_repository.get_cached_rate_data_by_key(cache_key)

        if cached_data:
            logger.info(f"Cache hit for {cache_key}")
            return cached_data.cache_value  # 返回缓存值

        # 如果缓存不存在，从 API 获取数据并存入缓存
        data = await __fetch_data_from_api(state_id, credit_score, product_id)
        await cached_rate_data_repository.add_cached_rate_data(cache_key, cache_value=data)
        # 创建新的缓存记录

        return data
    except Exception as e:
        logger.error(e)


async def __fetch_data_from_api(state_id, credit_score, product_id):
    current_timestamp_in_milli = int(time.time() * 1000)
    now = datetime.now()
    whole_hour = now.replace(minute=0, second=0, microsecond=0)
    # 转换为毫秒时间戳
    whole_hour_milliseconds = int(whole_hour.timestamp() * 1000)
    callback_string = f"jQuery_{whole_hour_milliseconds}"

    url = f"https://api.icanbuy.com/search-avg-rates/d0951c6cf9bb747a/?state_id={state_id}&product_ids={urllib.parse.quote(product_id)}&days=7&FICO={credit_score}&site_id=d0951c6cf9bb747a&LTV=80&callback={callback_string}&_={current_timestamp_in_milli}"
    logger.info(f"Fetching data from {url}")

    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response_text = await response.text()
            data = json.loads(response_text.replace(f"{callback_string}(", "").replace(");", "")).get("result")

    return data  # 假设返回的是 JSON 格式


ranges = ["780,850", "760,779", "740,759", "720,739", "700,719",
          "680,699", "660,679", "640,659", "620,639", "350,619"]


def __find_range(value, ranges):
    for r in ranges:
        lower, upper = map(int, r.split(','))
        if lower <= value <= upper:
            return lower
    return None  # 如果不在任何区间内返回None


def format_rate_page(state="national", credit_score=750):
    id_from_name = get_state_id_by_name(state)
    score = __get_score(credit_score)

    return f"https://widgets.icanbuy.com/c/standard/us/en/common/widgets/avgrates/trend/main.html?site_id=d0951c6cf9bb747a&state_id={id_from_name}&loan_products=MG01001%2CMG01003&credit_score={score}&cta_bg_color=6435ff"


def __get_score(credit_score):
    if credit_score < 350:
        return None

    if credit_score > 850:
        score = 780
    else:
        score = __find_range(credit_score, ranges)
        score = 540 if score == 350 else score

    return score


async def us_get_mortgage_rate_trend_by_score_and_state(state, credit_score, product_id="MG01001,MG01003"):
    id_from_name = get_state_id_by_name(state)

    score = __get_score(credit_score)

    if not id_from_name:
        return None

    try:
        r = await __get_rate_today_cached_data(id_from_name, score, product_id)
        return r
    except Exception as e:
        logger.info(e)
        return "Something went wrong"


class MothProductModel(BaseModel):
    product_id: str
    loan_term_in_month: int


def get_product_id_by_input_month(input_month) -> MothProductModel:
    # 10 years
    if input_month <= 150:
        return MothProductModel(product_id="MG01027", loan_term_in_month=120)
    # 15 years
    elif input_month <= 210:
        return MothProductModel(product_id="MG01001", loan_term_in_month=180)
    # 20 years
    elif input_month <= 300:
        return MothProductModel(product_id="MG01023", loan_term_in_month=240)
    # 30 years
    else:
        return MothProductModel(product_id="MG01003", loan_term_in_month=360)


def get_latest_rate(data):
    rates = data[0]["RATES"]
    latest_rate = None
    for rate in rates:
        if rate["RATE"] is not None:
            latest_rate = rate['RATE']
            break
    if latest_rate is not None:
        return round(latest_rate, 2)

    return None


def get_latest_rate_variation(data, product_id):
    for product in data:
        if product["PRODUCT_ID"] == product_id:
            rates = product["RATE_DATA"][0]["RATES"]

            # 查找最新和前一天的利率
            latest_rate = None
            previous_rate = None

            for rate in rates:
                if latest_rate is None and rate["RATE"] is not None:
                    latest_rate = rate
                elif latest_rate is not None and previous_rate is None and rate["RATE"] is not None:
                    previous_rate = rate
                elif latest_rate is not None and rate["RATE"] is None:
                    continue
                elif latest_rate is None and rate["RATE"] is None:
                    continue

            # 处理找到的前一天的有效利率
            if latest_rate is None:
                return None

            if previous_rate is None:
                for rate in rates:
                    if rate["RATE"] is not None:
                        previous_rate = rate
                        break

            # 计算利率变化并调整精度
            if latest_rate and previous_rate:
                latest_rate_value = Decimal(latest_rate["RATE"]) / 100
                previous_rate_value = Decimal(previous_rate["RATE"]) / 100
                variation = (latest_rate_value - previous_rate_value).quantize(Decimal('0.0001'),
                                                                               rounding=ROUND_HALF_UP)

                return {
                    "latest_rate": latest_rate_value.quantize(Decimal('0.0001'), rounding=ROUND_HALF_UP),
                    "variation": variation
                }

    return None
