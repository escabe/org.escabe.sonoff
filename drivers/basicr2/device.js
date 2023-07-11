'use strict';

const { Device } = require('homey');
const aesjs = require('aes-js')
const md5 = require('md5')

class MyDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */

  key = null;
  id = null;

  decrypt(data,iv) {
    var aesCbc = new aesjs.ModeOfOperation.cbc(this.key, Buffer.from(iv,'base64'));
    var encryptedBytes = Buffer.from(data,'base64');
    var textBytes = aesCbc.decrypt(encryptedBytes);
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
    
  //  this.api = new MyDeviceAPI(discoveryResult.address);
  //  await this.api.connect(); // When this throws, the device will become unavailable.
  }

  onDiscoveryAddressChanged(discoveryResult) {
    // Update your connection details here, reconnect when the device is offline
    this.log('onDiscoveryAddressChanged');

  }

  onDiscoveryLastSeenChanged(discoveryResult) {
    // When the device is offline, try to reconnect here
    this.log('onDiscoveryLastSeenChanged');
    
  }

}

module.exports = MyDevice;
