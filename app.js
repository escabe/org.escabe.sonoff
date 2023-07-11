'use strict';

const Homey = require('homey');
const mdns = require('multicast-dns')()

class MyApp extends Homey.App {


  seqMap = {};

  handleDNS(response) {
    if (response.type==='response' && 
        response.opcode === 'QUERY' && 
        response.answers[0].name==='_ewelink._tcp.local') {
  
      for (const ans of response.answers ){
        if (ans.type==='TXT') {
          let r = {}
          for (const data of ans.data) {
            const d = data.toString('utf8');
            const i = d.indexOf('=');
            r[d.slice(0,i)] = d.slice(i+1);
          }
          if (r.seq !== this.seqMap[r.id]) {
            this.seqMap[r.id] = r.seq;
            this.emit('eweLinkmDNSUpdate',r);
          }
        }
      }
    }
  }

  async onInit() {
    this.log('MyApp has been initialized');

    mdns.on('response', this.handleDNS.bind(this));
    
  }

}

module.exports = MyApp;
