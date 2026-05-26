# spacy/util.py

def compounding(start, end, rate):
    val = start
    while True:
        yield val
        val = min(val * rate, end)

def minibatch(items, size):
    if hasattr(size, '__next__') or hasattr(size, '__iter__'):
        size_iter = iter(size)
    else:
        size_iter = None
    
    i = 0
    while i < len(items):
        if size_iter:
            batch_size = int(next(size_iter))
        else:
            batch_size = int(size)
        yield items[i:i+batch_size]
        i += batch_size
