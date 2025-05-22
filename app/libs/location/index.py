import logging

import aioboto3
import time
from typing import Optional, Dict, Any
from botocore.exceptions import BotoCoreError, ClientError
from app import settings
logger = logging.getLogger(__name__)

class AwsAddressModel:
    def __init__(self,
                 region=Optional[str],
                 country=Optional[str],
                 raw=Optional[str],
                 lat=Optional[float],
                 lng=Optional[float]):
        self.region = region
        self.country = country
        self.raw = raw
        self.lat = lat
        self.lng = lng

    def to_dict(self):
        return vars(self)


class LocationService:
    def __init__(self, index_name: str):
        self.index_name = index_name

    async def reverse_geocode(self, lat: float, lng: float, lang: Optional[str] = None) -> Optional[AwsAddressModel]:
        request = {
            "IndexName": self.index_name,
            "Position": [lng, lat],
            "MaxResults": 1
        }

        if lang:
            request["Language"] = lang

        async with aioboto3.Session().client('location', region_name="us-west-2") as client:
            try:
                response = await client.search_place_index_for_position(**request)
                logger.info(f"Response: {response}")
                return self._parse_response(response)
            except (BotoCoreError, ClientError) as e:
                # 记录日志或监控系统以处理错误
                logger.info(f"Error occurred during reverse geocoding: {e}")
                return None

    def _parse_response(self, response: Dict[str, Any]) -> Optional[AwsAddressModel]:
        results = response.get("Results", [])
        if not results:
            return None

        place = results[0].get("Place", {})
        address = AwsAddressModel()
        
        geometry = place.get("Geometry", {}).get("Point", [])
        if len(geometry) == 2:
            address.lat = geometry[1]
            address.lng = geometry[0]

        address.region = place.get("Region")
        address.country = place.get("Country")
        address.raw = results

        return address

    @staticmethod
    def get_time_zone_id_from_location_timezone(time_zone: Optional[Dict[str, Any]]) -> Optional[str]:
        # 自定义逻辑解析 timeZone 的 ID
        return time_zone.get("Id") if time_zone else None

    @staticmethod
    def get_time_zone_name_from_location_timezone(time_zone: Optional[Dict[str, Any]]) -> Optional[str]:
        # 自定义逻辑解析 timeZone 的名称
        return time_zone.get("Name") if time_zone else None


location_service = LocationService(settings.location_index_name)
