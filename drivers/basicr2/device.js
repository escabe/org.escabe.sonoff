'use strict';

const crypto = require('crypto');

const { Device } = require('homey');
const aesjs = require('aes-js');
const md5 = require('md5');

const axios = require('axios');

class MyDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */

  key = null;
  id = null;
  ip = null;
  port = null; 

  encrypt(data) {
    const iv = crypto.randomBytes(16);
    const aesCbc = new aesjs.ModeOfOperation.cbc(this.key, iv);
    let textBytes = aesjs.utils.utf8.toBytes(JSON.stringify(data));
    textBytes = aesjs.padding.pkcs7.pad(textBytes);
    const encryptedBytes = aesCbc.encrypt(textBytes);
    return { data: Buffer.from(encryptedBytes).toString('base64'), iv: Buffer.from(iv).toString('base64') }
}

  decrypt(data,iv) {
    const aesCbc = new aesjs.ModeOfOperation.cbc(this.key, Buffer.from(iv,'base64'));
    const encryptedBytes = Buffer.from(data,'base64');
    const textBytes = aesCbc.decrypt(encryptedBytes);
    return aesjs.utils.utf8.fromBytes(aesjs.padding.pkcs7.strip(textBytes));
  }

  async onInit() {
    this.log('MyDevice has been initialized');
    this.id = this.getData().id;
    const key = this.getSetting('key');
    if (key) {
      this.key = md5(key,{asBytes:true});
    }

    this.homey.app.on('eweLinkmDNSUpdate',(data)=>{
      if (data.id == this.id && this.key) {
        try {
          const info = JSON.parse(this.decrypt(data.data1,data.iv));
          this.setCapabilityValue('onoff',info.switch === 'on');

        } catch(ex) {

        }
      }  
    });

    this.registerCapabilityListener('onoff',async (val)=>{
      const payload = {
        "sequence": "0",
        "encrypt": true,
        "deviceid": "10018bb8f1",
        "selfApikey": "123",
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
