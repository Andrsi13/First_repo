def get_cats_info(path):
    
    dataset = []
    dataset_it = 0
    catlist = []
    with open(path,'r') as fh:
        lines = fh.readlines()
        for line in lines:
            cats = {"id": None, "name": None, "age": None}
            info = line.strip().split(',')
            dataset.append(info)
            cats["id"] = dataset[dataset_it][0]
            cats["name"] = dataset[dataset_it][1]
            cats["age"] = dataset[dataset_it][2]
            dataset_it += 1
            catlist.append(cats)

        

        
    return catlist