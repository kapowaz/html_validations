require './application'

Validations.disable :run

map('/') { run Validations }