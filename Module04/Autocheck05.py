def split_list(grade):
    list_lower = []
    list_upper = []
    if not grade:
        return tuple([list_lower, list_upper])
    average = sum(grade) / len(grade)
   

    for i in grade:
        if i <= average:
            list_lower.append(i)
        else:
            list_upper.append(i)

    return tuple([list_lower, list_upper])