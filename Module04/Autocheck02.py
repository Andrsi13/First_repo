data = [5,3,6,1]
def prepare_data(data):
    new_data = sorted(data)
    new_data.pop(0)
    new_data.pop(-1)

    return new_data


print(prepare_data(data))