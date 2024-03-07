from collections import Counter


def get_count_visits_from_ip(ips):
    ip_enters = Counter(ips)
    return ip_enters


def get_frequent_visit_from_ip(ips):
    freqency = Counter.most_common(ips, 1)
    return freqency
