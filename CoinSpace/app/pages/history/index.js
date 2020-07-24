'use strict';

var Ractive = require('lib/ractive');
var emitter = require('lib/emitter');
var toUnitString = require('lib/convert').toUnitString;
var getTokenNetwork = require('lib/token').getTokenNetwork;
var getWallet = require('lib/wallet').getWallet;
var strftime = require('strftime');
var showError = require('widgets/modals/flash').showError;
var showTransactionDetail = require('widgets/modals/transaction-detail');
// add translate user change 
var language = require('lib/i18n')
var translate = require('counterpart')
module.exports = function(el) {
  var network = getTokenNetwork();
  var ractive = new Ractive({
    el: el,
    template: require('./index.ract'),
    components: {
      ChangeLocales: import('lib/changeLocales/index.js')
    },
    data: {
       // add translate user change 
       languageName:language.getLanguage(),
       translate:translate,
       translation:{},
      transactions: [],
      formatTimestamp: function(timestamp) {
        var date = new Date(timestamp)
        return strftime('%b %d %l:%M %p', date)
      },
      formatConfirmations: function(number) {
        if (network === 'ripple') return '';
        if (network === 'stellar') return '';
        if (number === 1) {
          return number + ' confirmation';
        } else {
          return number + ' confirmations';
        }
      },
      getToAddress: function(tx) {
        if (network === 'ethereum' || network === 'ripple') {
          return tx.to;
        } else if (network === 'stellar') {
          return tx.operations[0] && tx.operations[0].destination;
        } else if (['bitcoin', 'bitcoincash', 'litecoin', 'testnet'].indexOf(network) !== -1) {
          return tx.outs[0].address;
        }
      },

      isReceived: function(tx) {
        if (network === 'ethereum' || network === 'ripple') {
          return tx.to === getWallet().addressString;
        } else if (['bitcoin', 'bitcoincash', 'litecoin', 'testnet', 'stellar'].indexOf(network) !== -1) {
          return tx.amount > 0;
        }
      },
      isConfirmed: function(confirmations) {
        if (network === 'ripple') return true;
        if (network === 'stellar') return true;
        return confirmations >= getWallet().minConf;
      },
      isFailed: function(tx) {
        if (network === 'ethereum' || network === 'ripple') {
          return tx.status === false;
        } else if (['bitcoin', 'bitcoincash', 'litecoin', 'testnet', 'stellar'].indexOf(network) !== -1) {
          return false;
        }
      },
      toUnitString: toUnitString,
      loadingTx: true,
      hasMore: false,
      loadingMore: false
    }
  })

  emitter.on('append-transactions', function(newTxs) {
    newTxs.forEach(function(tx) {
      ractive.unshift('transactions', tx);
    })
    ractive.set('loadingTx', false)
  })

  emitter.on('set-transactions', function(txs) {
    var wallet = getWallet();
    network = getTokenNetwork();
    ractive.set('transactions', txs)
    ractive.set('hasMore', wallet ? wallet.hasMoreTxs : false)
    ractive.set('loadingTx', false)
  })

  emitter.on('sync', function() {
    ractive.set('transactions', [])
    ractive.set('loadingTx', true)
  })

  ractive.on('show-detail', function(context) {
    var index = context.node.getAttribute('data-index')
    var data = {
      transaction: ractive.get('transactions')[index],
      formatTimestamp: ractive.get('formatTimestamp'),
      formatConfirmations: ractive.get('formatConfirmations'),
      isReceived: ractive.get('isReceived'),
      isFailed: ractive.get('isFailed'),
      isConfirmed: ractive.get('isConfirmed'),
      toUnitString: ractive.get('toUnitString'),
      index:index,
      isNetwork: function(str) {
        return str === network
      }
    }
    showTransactionDetail(data)
  })

  ractive.on('load-more', function() {
    ractive.set('loadingMore', true);
    var transactions = ractive.get('transactions');
    var wallet = getWallet();
    var cursor;
    if (wallet.networkName === 'ripple') {
      cursor = transactions[transactions.length - 1].id;
    } else if (wallet.networkName === 'stellar') {
      cursor = transactions[transactions.length - 1].cursor;
    }

    wallet.loadTxs(wallet.addressString, cursor).then(function(result) {
      ractive.set('loadingMore', false);
      ractive.set('hasMore', result.hasMoreTxs)
      result.txs.forEach(function(tx) {
        ractive.push('transactions', tx);
      })
    }).catch(function(err) {
      console.error(err);
      ractive.set('loadingMore', false);
      showError({message: err.message});
    })
  })

  return ractive
}