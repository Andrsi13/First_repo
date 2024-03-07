from datetime import date


def get_days_in_month(month, year):
    next_month = month % 12 + 1
    if next_month == 1:
        year = year + 1
        delta = date(year, next_month, 1) - date(year - 1, month, 1)
    else:
        delta = date(year, next_month, 1) - date(year, month, 1)
    return delta.days


print(get_days_in_month(3, 2021))
