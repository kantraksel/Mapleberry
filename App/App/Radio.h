#pragma once
#include "SimCom/SimCom.h"

class Radio
{
private:
	int comStby;
	SimConnect::EventId stbyChangeId;

public:
	Radio();
	~Radio();

	bool Initialize();
	void Shutdown();

	void InterpretData(unsigned int value);
};
