  var calObj = {
    games: [],
    payScales: [],
    players: [],
    results: [],
    setPlayers: function(p) {this.players = p},
    setPayScales: function(scales) {this.payScales = scales},
    addGame: function(game) { this.games.push(game)},
    calculate: function() {
      this.init();
      var games = this.games;
      var payScales = this.payScales
      var results = this.results
      var players = this.players

        games.forEach(
          function(g) {
            var pay = payScales[g.fan-3]

            results.filter(
               i => (i.name == g.winner && g.self == 'No')
            ).forEach(n => n.balance += pay)
            results.filter(
               i => (i.name == g.winner && g.self == 'Yes')
            ).forEach(n => n.balance += pay * 1.5)
            results.filter(
               i => (i.name == g.loser && g.self == 'No')
            ).forEach(n => n.balance -= pay)
            results.filter(
               i => (i.name != g.winner && g.self == 'Yes')
            ).forEach(n => n.balance -= pay / 2)
          }
        )

      this.results = results


    },
    init: function() {
      var results = [];
      this.players.forEach(function(p) {
        results.push(
          {
            name: p,
            balance: 0
          }
        )
      })
      this.results = results;
    }
  }

  var game = {
    winner:'',
    loser: '',
    self: '',
    fan: 0
  }


module.exports = calObj;