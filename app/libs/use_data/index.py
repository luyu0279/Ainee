import json
import os
from typing import Any

import pandas as pd
from rapidfuzz import process, fuzz

current_dir = os.path.dirname(os.path.abspath(__file__))
us_data_root = os.path.abspath(os.path.join(current_dir, "../../../data"))


# read state json from file

class StateJSONLoader:
    def __init__(self):
        self.filename = f"{us_data_root}/use-states.json"
        with open(self.filename, 'r', encoding='utf-8') as file:
            self.data = json.load(file)

    def get_data(self):
        return self.data


class ZipCodeService:
    def __init__(self):
        # 获取 CSV 文件的路径
        csv_path = os.path.abspath(os.path.join(current_dir, f"{us_data_root}/uszips-new.csv"))

        # 读取 CSV 文件
        self.df = pd.read_csv(csv_path, na_values=['', 'NaN'])
        # 将 zip code 列转为字符串，确保前导零不会丢失
        self.df['zip'] = self.df['zip'].astype(str).str.zfill(5)
        # 只保留需要的字段
        self.df = self.df[['zip', 'city', 'name', 'id']]

        # 创建 name 的查找字典
        self.state_lookup = {
            name.lower(): self.df[self.df['name'].str.lower() == name.lower()].to_dict(
                orient="records")
            for name in self.df['name'].unique()
        }

        # 创建 zip 列表和 state 列表用于模糊匹配
        self.zip_codes = list(self.df['zip'])
        self.names = [state.lower() for state in self.df['name'].unique()]

    def find_by_zip(self, zip_code):
        zip_code = str(zip_code).zfill(5)

        # 先尝试精确匹配
        exact_match = self.df[self.df['zip'] == zip_code]
        if not exact_match.empty:
            return exact_match.to_dict(orient="records")

        # 如果精确匹配失败，进行模糊匹配
        matches = process.extract(zip_code, self.zip_codes, limit=10, scorer=fuzz.partial_ratio)
        results = []
        for match in matches:
            if match[1] >= 80:  # 80% 相似度阈值
                results.append(self.df[self.df['zip'] == match[0]].to_dict(orient="records")[0])
        return results

    def find_by_state(self, name):
        # 先尝试精确匹配
        exact_match = self.state_lookup.get(name.lower(), [])
        if exact_match:
            return exact_match

        # 如果精确匹配失败，进行模糊匹配
        matches = process.extract(name, self.names, limit=5, scorer=fuzz.ratio)
        results = []
        for match in matches:
            if match[1] >= 80:  # 80% 相似度阈值
                results.extend(self.state_lookup.get(match[0].lower(), []))
        return results
