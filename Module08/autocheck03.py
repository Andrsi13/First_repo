from datetime import datetime


def get_str_date(date):

    date_obj = datetime.strptime(date, "%Y-%m-%d %H:%M:%S.%fZ")
    res = date_obj.strftime("%A %d %B %Y")
    return res
