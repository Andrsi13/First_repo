
def first(size, *topics):
    return size + len(topics)


def second(size, **words):
    return size + len(words)

a = first(5, "first", "second", "third")
print(a)
    