import numpy as np
import numpy_financial as npf
from enum import Enum


# 定义日期单位的枚举类型
class DateUnit(Enum):
    D = 'D'  # 天数
    M = 'M'  # 月数
    Y = 'Y'  # 年数


class FinancialUtils:
    @staticmethod
    def cumipmt(rate, per, nper, pv, fv=0, when='end'):
        # 检查输入参数的有效性
        return np.sum(npf.ipmt(
            rate,
            np.arange(per, nper + 1),
            nper,
            pv,
            fv,
            when
        ))

    # 计算累计本金偿还额 (CUMPRINC)
    @staticmethod
    def cumprinc(rate, nper, pv, start_period, end_period, fv=0, when='end'):
        cumprinc = 0

        for per in range(start_period, end_period + 1):
            cumprinc += npf.ppmt(rate, per, nper, pv, fv, when)
        return cumprinc

    @staticmethod
    def nper(rate, pmt, pv, fv=0, when=0):
        return np.round(npf.nper(rate, pmt, pv, fv, when), 5)

    # 计算两个日期之间的差异，基于指定的单位：天数 (D)、月数 (M) 或年数 (Y)
    @staticmethod
    def date_diff(start_date, end_date, unit):
        if unit == DateUnit.D:
            return (end_date - start_date).days
        elif unit == DateUnit.M:
            year_diff = end_date.year - start_date.year
            month_diff = end_date.month - start_date.month
            return year_diff * 12 + month_diff
        elif unit == DateUnit.Y:
            return end_date.year - start_date.year
        else:
            raise ValueError("Invalid date unit")
