#pragma once
#include <optional>
#include "Utils/FixedArray.h"

enum class RxCmd;

class WebDriver
{
private:
	std::optional<std::pair<FixedArrayCharS, FixedArrayCharS>> resyncMsg;

	void FinishResync();
	void HandleRxMessages(RxCmd id, uint64_t value);

public:
	WebDriver();
	~WebDriver();

	void Initialize();
	void OnSimConnect();
	void OnSimDisconnect();
};
