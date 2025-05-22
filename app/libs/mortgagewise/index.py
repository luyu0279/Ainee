import asyncio
import json
import logging
import os
from datetime import datetime
from enum import Enum
from typing import Optional
from urllib.parse import urlencode, urlparse
import aiohttp
from bs4 import BeautifulSoup

from app.common import retry_async, format_with_commas
from app.database.cached_rate_data import cached_rate_data_repository

logger = logging.getLogger(__name__)


class MortgageWisePropertyType(str, Enum):
    HDB = "3"
    PrivateProperty = "1"


class LoanRateType(str, Enum):
    fixed = "fixed"
    floating = "floating"
    all = "all"


class MortgageWiseScraper:
    def __init__(self, filter_property, filter_loan_size, filter_tenure):
        self.url = "https://www.mortgagewise.sg/mortgage-rates/"
        self.headers = {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "accept-language": "en,en-GB;q=0.9,zh;q=0.8,zh-HK;q=0.7,zh-TW;q=0.6,ja;q=0.5,zh-CN;q=0.4",
            "cache-control": "max-age=0",
            "content-type": "application/x-www-form-urlencoded",
            "origin": "https://www.mortgagewise.sg",
            "priority": "u=0, i",
            "referer": "https://www.mortgagewise.sg/mortgage-rates/",
            "sec-ch-ua": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": '"macOS"',
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "upgrade-insecure-requests": "1",
        }
        self.form_data = {
            "filter_property": filter_property,
            "filter_category": "1",  # 1 for refinancing
            "filter_lockin": "all",
            "filter_subsidy": "all",
            "filter_average": "3",
            "filter_loan_size": filter_loan_size,
            "filter_tenure": filter_tenure,
            "pw-generate": "Search",
        }

        logger.info(self.form_data)

    def _get_bank_name_by_icon_url(self, icon_url):
        try:
            # 获取文件名
            file_name = os.path.basename(urlparse(icon_url).path)

            # 去掉扩展名
            file_name_no_ext = os.path.splitext(file_name)[0]

            # 替换 "logo-" 为空字符串，并将中划线替换为空格
            return file_name_no_ext.replace("logo-", "").replace("-", " ")
        except Exception as e:
            logger.error(e)
            return ""

    def _get_typed_rate(self, tab_html):
        table = tab_html.find("table", {"id": "package-main-info"})
        data = []

        for row in table.find_all("tr"):
            if not row.has_attr("class"):
                cells = row.find_all("td")
                if len(cells) < 9:
                    continue

                bank_img = cells[0].find("img")
                if bank_img and "src" in bank_img.attrs:
                    bank_img_src = bank_img["src"]
                    # 如果bank_img_src不是以http或https开头，加上https
                    if not bank_img_src.startswith(("http://", "https://")):
                        bank_img_src = f"https:{bank_img_src}" if bank_img_src else ""
                else:
                    bank_img_src = ""

                loan_peg_text = cells[1].text.strip() if len(cells) > 1 else ""
                loan_peg_sign = (
                    loan_peg_text[-1] if loan_peg_text[-1] in ["+", "-"] else ""
                )
                loan_peg = loan_peg_text[:-1] if loan_peg_sign else loan_peg_text
                # trim loan_peg
                loan_peg = loan_peg.strip()

                rates = []
                for i in range(2, 5):
                    cell = cells[i]
                    rate_dict = {}
                    if cell:
                        spread = cell.find(class_="mw-bs")
                        rate_dict["spread"] = spread.text.strip() if spread else ""
                        rate = cell.div.text.strip() if cell.div else ""
                        rate_dict["rate"] = rate
                    rates.append(rate_dict)

                average_3yr_cell = cells[4] if len(cells) > 4 else None
                average_3yr_dict = {}
                if average_3yr_cell:
                    spread = average_3yr_cell.find(class_="mw-bs")
                    average_3yr_dict["spread"] = spread.text.strip() if spread else ""
                    rate = (
                        average_3yr_cell.div.text.strip()
                        if average_3yr_cell.div
                        else ""
                    )
                    average_3yr_dict["rate"] = rate

                rates_4_to_6 = []
                for i in range(6, 9):
                    cell = cells[i]
                    rate_dict = {}
                    if cell:
                        spread = cell.find(class_="mw-bs")
                        rate_dict["spread"] = spread.text.strip() if spread else ""
                        rate = cell.div.text.strip() if cell.div else ""
                        rate_dict["rate"] = rate
                    rates_4_to_6.append(rate_dict)

                bank_data = {
                    "bank_img": bank_img_src,
                    "bank_name": self._get_bank_name_by_icon_url(bank_img_src),
                    "loan_peg": loan_peg,
                    "loan_peg_sign": loan_peg_sign,
                    "yr_1": rates[0],
                    "yr_2": rates[1],
                    "yr_3": rates[2],
                    "average_3yrs": average_3yr_dict,
                    "yr_4": rates_4_to_6[0],
                    "yr_5": rates_4_to_6[1],
                    "yr_6": rates_4_to_6[2],
                }
                data.append(bank_data)

        return data

    def soup_parser(self, html: str):
        soup = BeautifulSoup(html, "html.parser")
        tablist = soup.find("ul", {"role": "tablist"})
        floating_tab = soup.find("div", {"id": "pw-tab1"})
        floating_rate = self._get_typed_rate(floating_tab)
        fixed_tab = soup.find("div", {"id": "pw-tab2"})
        fixed_rate = self._get_typed_rate(fixed_tab)

        return {"floating": floating_rate, "fixed": fixed_rate}

    async def fetch_html(self, session, url, headers, data):
        async with session.post(url, headers=headers, data=data) as response:
            return await response.text()

    @retry_async(Exception, tries=3, delay=10, backoff=2)
    async def scrape(self):
        data = urlencode(self.form_data).encode("ascii")
        async with aiohttp.ClientSession() as session:
            html = await self.fetch_html(session, self.url, self.headers, data)
            return self.soup_parser(html)


def __get_rate_cache_key(property_type, loan_size, tenure):
    date = datetime.now().strftime("%Y-%m-%d")
    return f"sg_{property_type}_{loan_size}_{tenure}_{date}"


async def __get_data_from_cache(property_type: str, loan_size: str, tenure: str):
    try:
        cache_key = __get_rate_cache_key(property_type, loan_size, tenure)
        cached_data = await cached_rate_data_repository.get_cached_rate_data_by_key(
            cache_key
        )
        cache_value = None
        if cached_data:
            logger.info(f"Cache hit for {cache_key}")
            cache_value = cached_data.cache_value  # 返回缓存值
        else:
            # 如果缓存不存在，从 API 获取数据并存入缓存
            cache_value = await __fetch_data_from_api(property_type, loan_size, tenure)

            if not cache_value:
                return None

            await cached_rate_data_repository.add_cached_rate_data(
                cache_key, cache_value=cache_value
            )

        return cache_value
    except Exception as e:
        logger.error(e)
        return None


def __get_min_average_3yrs(data, key) -> Optional[float]:
    try:
        # 获取指定键的列表
        banks = data.get(key, [])
        if not banks:  # 如果列表为空，返回 None
            return None

        # 提取所有银行的 average_3yrs 的 rate
        rates = []
        for bank in banks:
            rate_str = bank.get("average_3yrs", {}).get("rate")
            if rate_str:
                rates.append(float(rate_str))  # 转换为浮动类型进行比较

        if rates:  # 如果 rates 不为空，返回最小值
            return min(rates)
        else:
            return None
    except Exception as e:
        print(f"Error while processing {key}: {e}")
        return None


async def __fetch_data_from_api(
    property_type: str = "3", loan_size: str = "750,000", tenure: str = "25"
):
    scraper = MortgageWiseScraper(
        filter_property=f"{property_type}|{loan_size}|{tenure}",
        filter_loan_size=loan_size,
        filter_tenure=tenure,
    )

    try:
        return await scraper.scrape()
    except Exception as e:
        logger.error(e)
        return None


async def get_default_size_and_tenure(property_type: str):
    loan_size = "750000"
    tenure = "25"

    if property_type == MortgageWisePropertyType.HDB:
        loan_size = "350000"
        tenure = "20"

    return loan_size, tenure


async def sg_get_rate_today_data(
    property_type: str = "3", loan_rate_type: str = "floating"
):
    loan_size, tenure = await get_default_size_and_tenure(property_type)
    cache_value = await __get_data_from_cache(
        property_type=property_type,
        loan_size=format_with_commas(loan_size),
        tenure=tenure,
    )
    loan_type_data = cache_value.get(loan_rate_type)

    if loan_type_data is None:
        logger.error(f"Loan type {loan_rate_type} not found in cache")
        return None

    result = [
        {
            "average_3yrs": item["average_3yrs"],
            "bank_name": item["bank_name"],
            "loan_peg": item["loan_peg"],
        }
        for item in loan_type_data
    ]

    return result


async def sg_get_minimal_rate_today_data(
    property_type: str = MortgageWisePropertyType.PrivateProperty,
):
    loan_size, tenure = await get_default_size_and_tenure(property_type)

    cache_value = await __get_data_from_cache(
        property_type.value, loan_size=format_with_commas(loan_size), tenure=tenure
    )
    if cache_value is None:
        return None

    floating_min = __get_min_average_3yrs(cache_value, "floating")
    fixed_min = __get_min_average_3yrs(cache_value, "fixed")

    return {"floating": floating_min, "fixed": fixed_min}


async def sg_get_rate_today_data_by_multi_filter(
    property_type: MortgageWisePropertyType,
    loan_size: str,
    tenure: str,
    loan_rate_type: Optional[LoanRateType],
) -> Optional[list]:
    cache_value = await __get_data_from_cache(
        property_type.value, loan_size=loan_size, tenure=tenure
    )
    if cache_value is None:
        return None

    floating = cache_value.get("floating") or []

    if not isinstance(floating, list):
        floating = []

    fixed = cache_value.get("fixed") or []

    if not isinstance(fixed, list):
        fixed = []

    if loan_rate_type == LoanRateType.all:
        # merge floating and fixed rate, to a list
        merged_rates = floating + fixed
        return merged_rates

    if loan_rate_type == LoanRateType.floating:
        return floating

    if loan_rate_type == LoanRateType.fixed:
        return fixed

    return None
