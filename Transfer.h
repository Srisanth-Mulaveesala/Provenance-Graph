#ifndef TRANSFER_H
#define TRANSFER_H

class Transfer {
private:
    int sourceID;
    int destinationID;
    int productID;

public:
    Transfer(int source = -1, int destination = -1, int product = 0);

    int getSourceID() const;
    int getDestinationID() const;
    int getProductID() const;
};

#endif
