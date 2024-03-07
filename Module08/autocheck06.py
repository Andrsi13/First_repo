import collections

Cat = collections.namedtuple("Cat", ["nickname", "age", "owner"])


def convert_list(cats):
    for element in cats:
        if isinstance(element, dict):
            new_cat = []
            new_cat_list = []
            for cat in cats:
                new_cat.append(cat["nickname"])
                new_cat.append(cat["age"])
                new_cat.append(cat["owner"])
                new_cat_list.append(new_cat)

            return [Cat(**cat) for cat in new_cat_list]

        else:
            cat_dict = {}
            cat_dict_list = []
            for cat in cats:
                cat_dict["nickname"] = cat[0]
                cat_dict["age"] = cat[1]
                cat_dict["owner"] = cat[2]
                cat_dict_list.append(cat_dict)
            return cat_dict_list


a = [
    {"nickname": "Mick", "age": 5, "owner": "Sara"},
    {"nickname": "Barsik", "age": 7, "owner": "Olga"},
    {"nickname": "Simon", "age": 3, "owner": "Yura"},
]
print(convert_list(a))
