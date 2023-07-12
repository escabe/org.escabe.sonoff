'use strict';

const crypto = require('crypto');

const { Device } = require('homey');

const axios = require('axios');

class MyDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */

  key = null;
  id = null;
  ip = null;
  port = null; 
  sequence = 0;

  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const aesCbc = crypto.createCipheriv('aes-128-cbc', this.key, iv);
    const encrypted = Buffer.concat([
      aesCbc.update(JSON.stringify(data),'utf-8'),
      aesCbc.final()
    ]);
    return { data: encrypted.toString('base64'), iv: iv.toString('base64') }
}

  decrypt(data,iv) {
    iv = Buffer.from(iv,'base64');
    const aesCbc = crypto.createDecipheriv('aes-128-cbc', this.key, iv);
    const decrypted = Buffer.concat([
      aesCbc.update(data,'base64'),
      aesCbc.final()
    ]);
    return decrypted.toString('utf-8');
  }

  setKey(key) {
    const md5 = crypto.createHash('md5');
    md5.update(Buffer.from(key));
    this.key = md5.digest();
  }

  async onInit() {
    this.log('MyDevice has been initialized');
    this.id = this.getData().id;
    const key = this.getSetting('key');
    if (key) {
      this.setKey(key);
    }

    this.homey.app.on('eweLinkmDNSUpdate',(data)=>{
      if (data.id == this.id && this.key) {
        try {
          const info = JSON.parse(this.decrypt(data.data1,data.iv));
          this.setCapabilityValue('onoff',info.switch === 'on');

        } catch(ex) {
          this.log(ex);
        }
      }  
    });

    this.registerCapabilityListener('onoff',async (val)=>{
      const payload = {
        "sequence": (this.sequence++).toString(),
        "encrypt": true,
        "deviceid": "10018bb8f1",
        "selfApikey": "31415",
        ... this.encrypt({switch: val ? 'on':'off'})
      };
      axios.post(`http://${this.ip}:${this.port}/zeroconf/switch`,payload);
    });

  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('MyDevice settings where changed');
    if (changedKeys.includes('key')) {
      this.setKey(newSettings.key);
    }
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MyDevice has been deleted');
  }

  onDiscoveryResult(discoveryResult) {
    // Return a truthy value here if the discovery result matches your device.
    this.log('onDiscoveryResult');
    return discoveryResult.id === this.getData().id;
  }

  async onDiscoveryAvailable(discoveryResult) {
    // This method will be executed once when the device has been found (onDiscoveryResult returned true)
    this.log('onDiscoveryAvailable'); 
    this.ip = discoveryResult.address;
    this.port = discoveryResult.port;
    this.homey.app.emit('eweLinkmDNSUpdate',discoveryResult.txt);
    
  //  this.api = new MyDeviceAPI(discoveryResult.address);
  //  await this.api.connect(); // When this throws, the device will become unavailable.
  }

  onDiscoveryAddressChanged(discoveryResult) {
    // Update your connection details here, reconnect when the device is offline
    this.log('onDiscoveryAddressChanged');
    this.ip = discoveryResult.address;

  }

  onDiscoveryLastSeenChanged(discoveryResult) {
    // When the device is offline, try to reconnect here
    this.log('onDiscoveryLastSeenChanged');
    
  }

}

module.exports = MyDevice;
