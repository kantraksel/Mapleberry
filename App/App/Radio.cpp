#include "Radio.h"
#include "Utils/Logger.h"

extern SimCom simcom;

struct Radio_Model : SimConnect::DataModel
{
	struct Radio
	{
		unsigned int freq;
	};

	static const VarDef vars[1];

	void GetModel(const VarDef** pArray, unsigned int* count) const override
	{
		*pArray = vars;
		*count = sizeof(vars) / sizeof(*vars);
	}
	const char* GetName() const override
	{
		return "Radio";
	}
};
const SimConnect::DataModel::VarDef Radio_Model::vars[] =
{
	{ VarType::INT32, "COM STANDBY FREQUENCY:1", "Hz" },
};
static Radio_Model radioModel;

Radio::Radio()
{
	comStby = 118000;
	stbyChangeId = 0;
}

Radio::~Radio()
{
}

bool Radio::Initialize()
{
	auto& client = simcom.GetSimConnect();

	client.RegisterDataModel(radioModel);

	client.RequestDataOnSimObject(SimConnect::ObjectIdUser, radioModel, [this](void* data, SimConnect::ObjectId)
		{
			auto& info = *reinterpret_cast<Radio_Model::Radio*>(data);
			comStby = info.freq / 1000;

			Logger::Log("STBY: {:.3f}", double(comStby) / 1000);
		});

	stbyChangeId = client.MapEvent("COM_STBY_RADIO_SET_HZ", [this](unsigned int data[5])
		{
			comStby = data[0] / 1000;

			Logger::Log("STBY: {:.3f}", double(comStby) / 1000); // update if no update within last second (aka dedup)
		});
	client.AddEventToGroup(stbyChangeId, SimConnect::DefaultGroup);
	return true;
}

void Radio::Shutdown()
{
}

void Radio::InterpretData(unsigned int value)
{
	int v = (int)value;
	int freq = this->comStby;
	freq += v * 5;

	if (v > 0)
	{
		int fract = freq % 100;
		if (fract == 20)
			freq += 5;
		else if (fract == 45)
			freq += 5;
		else if (fract == 70)
			freq += 5;
		else if (fract == 95)
			freq += 5;
	}
	else
	{
		int fract = freq % 100;
		if (fract == 20)
			freq -= 5;
		else if (fract == 45)
			freq -= 5;
		else if (fract == 70)
			freq -= 5;
		else if (fract == 95)
			freq -= 5;
	}
	freq = freq < 118000 ? 136975 - 118000 + 5 + freq : (freq > 136975 ? 118000 - 136975 - 5 + freq : freq);

	comStby = freq;
	freq *= 1000;
	simcom.GetSimConnect().TransmitEvent(stbyChangeId, (unsigned int)freq);

	Logger::Log("STBY: {:.3f} ({} ticks)", double(comStby) / 1000, v);
}
