#include "Transfer.h"

Transfer::Transfer(int source, int destination, int product)
    : sourceID(source), destinationID(destination), productID(product) {}

int Transfer::getSourceID() const { return sourceID; }
int Transfer::getDestinationID() const { return destinationID; }
int Transfer::getProductID() const { return productID; }
