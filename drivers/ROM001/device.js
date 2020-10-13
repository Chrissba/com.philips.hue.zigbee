'use strict';

const Homey = require('homey');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const OnOffBoundCluster = require('../../lib/OnOffBoundCluster');
const LevelControlBoundCluster = require('../../lib/LevelControlBoundCluster');

class SmartButton extends ZigBeeDevice {

async onNodeInit({ zclNode }) {
    
    // Buttons
    zclNode.endpoints[1].bind(CLUSTER.ON_OFF.NAME, new OnOffBoundCluster({
      onSetOn: this._onCommandParser.bind(this),
      onSetOff: this._offCommandParser.bind(this),
      offWithEffect: this._offCommandParser.bind(this)
    }));

    zclNode.endpoints[1].bind(CLUSTER.LEVEL_CONTROL.NAME, new LevelControlBoundCluster({
      onStep: this._stepCommandParser.bind(this),
      onStepWithOnOff: this._stepCommandParser.bind(this),
      onStop: this._stopCommandParser.bind(this),
      onStopWithOnOff: this._stopCommandParser.bind(this),
    }));

    this._switchOnTriggerDevice = this.homey.flow.getDeviceTriggerCard('ROM001_on');
    this._switchOffTriggerDevice = this.homey.flow.getDeviceTriggerCard('ROM001_off');
    this._switchDimTriggerDevice = this.homey.flow.getDeviceTriggerCard('ROM001_dim')
      .registerRunListener(async (args, state) => {
        return (null, args.action === state.action);
      });

		// alarm_battery
		if (this.hasCapability('alarm_battery')) {				
      this.batteryThreshold = 20;
			this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
				getOpts: {
				getOnStart: true,
				},
				reportOpts: {
					configureAttributeReporting: {
						minInterval: 0, // No minimum reporting interval
						maxInterval: 60000, // Maximally every ~16 hours
						minChange: 10, // Report when value changed by 10
					},
				},
      });
		}

  }

  _onCommandParser() {
    return this._switchOnTriggerDevice.trigger(this, {}, {})
      .then(() => this.log('triggered ROM001_on'))
      .catch(err => this.error('Error triggering ROM001_on', err));
  }

  _offCommandParser() {
    return this._switchOffTriggerDevice.trigger(this, {}, {})
      .then(() => this.log('triggered ROM001_off'))
      .catch(err => this.error('Error triggering ROM001_off', err));
  }

  _stepCommandParser(payload) {
    var action = payload.stepSize === 30 ? 'press' : 'hold'; // 30=press,56=hold
    return this._switchDimTriggerDevice.trigger(this, {}, { action: `${payload.mode}-${action}` })
      .then(() => this.log(`triggered ROM001_dim, action=${payload.mode}-${action}`))
      .catch(err => this.error('Error triggering ROM001_dim', err));
  }

  _stopCommandParser() {
    return this._switchDimTriggerDevice.trigger(this, {}, { action: 'release' })
    .then(() => this.log('triggered ROM001_dim, action=release'))
    .catch(err => this.error('Error triggering ROM001_dim', err));
  }

}

module.exports = SmartButton;