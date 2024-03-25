const App = {
  web3Provider: null,
  contracts: {},
  account: '0x0',

  init: async function () {
    await this.initWeb3();
    await this.initContract();
    this.listenForEvents();
    this.render();
  },

  initWeb3: async function () {
    if (window.ethereum) {
      this.web3Provider = window.ethereum;
      try {
        await window.ethereum.enable();
      } catch (error) {
        console.error("User denied account access");
      }
    } else if (window.web3) {
      this.web3Provider = window.web3.currentProvider;
    } else {
      this.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    }
    web3 = new Web3(this.web3Provider);
  },

  initContract: async function () {
    const data = await $.getJSON("Evoting.json");
    this.contracts.Evoting = TruffleContract(data);
    this.contracts.Evoting.setProvider(this.web3Provider);
  },

  listenForEvents: function () {
    this.contracts.Evoting.deployed().then(function (instance) {
      instance.votedEvent({}, {
        fromBlock: 0,
        toBlock: 'latest'
      }).watch(function (error, event) {
        console.log("event triggered", event)
        if (event){
          $("#content").show();
          $("#loader").hide();
          App.render();
          // to block rerender
          event.preventDefault();
        }
      })
    });
  },


  render: function () {
    const loader = $("#loader");
    const content = $("#content");
    loader.show();
    content.hide();

    web3.eth.getAccounts(function (err, accounts) {
      if (err) {
        console.log(err);
      }
      App.account = accounts[0];
      $("#accountAddress").html("Your Account: " + App.account);
    });

    this.contracts.Evoting.deployed().then(async function (instance) {
      const numCandidates = await instance.numCandidates();
      const candidatesResults = $("#candidatesResults");
      candidatesResults.empty();
      const candidatesSelect = $('#candidatesSelect');
      candidatesSelect.empty();
      const candidatePromises = [];
      for (let rank = 1; rank <= numCandidates; rank++) {
        candidatePromises.push(instance.candidates(rank));
      }
      const candidateData = await Promise.all(candidatePromises);
      candidateData.sort((a, b) => b[2] - a[2]);
      console.log(candidateData)
      candidateData.forEach(function (candidate) {
        const id = candidate[0];
        const name = candidate[1];
        const numVotes = candidate[2];
        const candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + numVotes + "</td></tr>";
        candidatesResults.append(candidateTemplate);
        const candidateOption = "<option value='" + id + "' >" + name + "</ option>";
        candidatesSelect.append(candidateOption);
      });
      const hasVoted = await instance.voters(App.account);
      if (hasVoted) {
        $('form').hide();
      }
      loader.hide();
      content.show();
    }).catch(function (error) {
      console.warn(error);
    });
  },


  castVote: function () {
    const candidateId = $('#candidatesSelect').val();
    this.contracts.Evoting.deployed().then(function (instance) {
      return instance.vote(candidateId, { from: App.account });
    }).then(function (result) {
      $("#content").hide();
      $("#loader").show();
    }).catch(function (err) {
      console.error(err);
    });
  }
};

$(function () {
  $(window).on('load', function () {
    App.init();
  });
});
