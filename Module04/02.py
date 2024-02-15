
def is_flush(cards):
    res = set()
    for card in cards:
        mark = card[-1]
        res.add(mark)


    return len(res) == 1



cards = ["AS", "3S", "9S", "KS", "4S"]
print(is_flush(cards))