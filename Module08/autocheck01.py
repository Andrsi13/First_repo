from datetime import datetime


def get_days_from_today(date):
    today = datetime.today()
    today_date = today.date()
    formated_date = date.split("-")
    print(today_date)
    print(formated_date)
    data_date = datetime(
        year=int(formated_date[0]),
        month=int(formated_date[1]),
        day=int(formated_date[2]),
    )
    a = data_date.date()
    print(a)
    result = today_date - a
    print(result)
    return result.days


date = "2020-10-09"
print(get_days_from_today(date))
