var Validations = (function(){
  var module = {
    forms: [],
    
    attributes: [
      'data-validation-presence', // should this be ‘data-validation-required’ ?
      'data-validation-length',
      'data-validation-unique',
      'data-validation-format',
      'data-validation-confirmation',
      'data-validation-remote-method',
      'data-validation-prerequisite'
    ],
    
    // default error messages are intentionally user-unfriendly; you should supply your own error messages.
    messages: {
      'data-validation-presence':       'This field is required',
      'data-validation-length':         'This field needs to be between {0} and {1} characters long',
      'data-validation-unique':         'This value is not unique',
      'data-validation-format':         'This value should match the format ‘{0}’',
      'data-validation-confirmation':   'This field should have the same value as ‘{0}’',
      'data-validation-remote-method':  'This value failed the remote method callback',
      'data-validation-prerequisite':   'This field is required as its prerequisite has been met'
    },
    
    init: function(){
      var module = this;
      
      $('form').each(function(){
        var form   = $(this);
        
        // default state for any form
        form.data('validations.valid',      null);
        form.data('validations.validated',  false);
        form.data('validations.errors',     {});
        form.data('validations.fields',     []);
        form.data('validations.pending',    0);
        
        var selectors = jQuery.map(module.attributes, function(attribute){ return '[' + attribute + ']'; }).join();
        
        $(selectors, form).each(function(){
          var field = $(this);
          
          // TODO: perhaps initiate a setTimeout so this doesn't fire multiple validation checks on keyup?
          field.on('change', function(e){ module.validateField(field, e); });
          // field.on('keyup', function(e){ module.validateField(field, e); });
          
          // default state for any field
          field.data('validations.valid',     null);
          field.data('validations.validated', false);
          field.data('validations.errors',    {}); // redundant ?
          field.data('validations',           {});
          jQuery.each(module.attributes, function(i, attribute){
            if (field.attr(attribute) != undefined) {
              var name = module.camelCase(attribute.replace('data-validation-',''));

              if (attribute == 'data-validation-prerequisite') {
                // handle prerequisites separately to validations
                field.data('prerequisite', {
                  target:       field.attr(attribute),
                  message:      field.attr(attribute + '-message') || module.message(attribute),
                  value:        field.attr(attribute + '-value') || undefined,
                  format:       field.attr(attribute + '-format') || undefined,
                  lengthRange:  field.attr(attribute + '-length') || undefined
                });
              } else {
                if (name == 'length') { name = 'lengthRange'; }
                field.data('validations')[name] = {
                  rule:     (field.attr(attribute) == "" ? true : field.attr(attribute)),
                  message:  field.attr(attribute + '-message')
                };
              }
            }
          });
          
          form.data('validations.fields').push(field);
        });
        
        $(document).on('submit', form, function(e){ e.preventDefault(); if (module.validateForm(form) === true) { form.submit(); }; });
        module.forms.push(form);
      });
      
      // bind validate in the jQuery namespace for convenience
      jQuery.fn.validate = function(){ module.valid($(this)); };
      
    }, // module.init()
    
    valid: function(element){
      var module = this;
      
      // implicitly by requesting the validity of this thing, we need to validate it first
      switch ($(element)[0].nodeName) {
        case 'SELECT':
        case 'INPUT':
          module.validateField(element);
          break;
        case 'FORM':
          module.validateForm(element);
          break;
      }
      
      return element.data('validations.valid');
    },
    
    validateField: function(field, e){
      var module = this;
      var form   = field.closest('form');
      
      if ((e == undefined || form.data('validations.validated')) && 
          ((field.data('validations') && !field.data('prerequisite')) ||
          (field.data('prerequisite') && module.prerequisites(field)))) {
        
        // go through each validation…
        jQuery.each(field.data('validations'), function(name){
          module.validator[name](field);
        });
        
        // if there are no validation errors, the field is implicitly valid
        if (jQuery.map(field.data('validations.errors'), function(){ return true; }).length == 0) {
          field.data('validations.valid', true);
        }
      }
      
      return field.data('validations.valid');
    }, // module.validateField()
    
    validateForm: function(form){
      var module = this;
      
      form.data('validations.validated', true);
      
      var invalid_fields = 0;
      
      // validate all fields within this form
      jQuery.each(form.data('validations.fields'), function(i, field){
        var valid = module.validateField(field);
        
        if (field.data('validations.valid') === false) {
          invalid_fields += 1;
          module.errors(field);
          // TODO: if any of them has a requirement of uniqueness, set a timeout / callback for showing the result.
        }
      });

      return form.data('validations.valid', invalid_fields < 1);
    }, // module.validateForm()
    
    prerequisites: function(field){
      var module  = this;
      var form    = field.closest('form');
      var met     = 0;
      
      jQuery.each(field.data('prerequisite').target.split(','), function(i, name){
        var target = $('[name=' + name + ']');
        switch (true) {
          // TODO: also implement tests for lengthRange (and any other types of prerequisite test?)
          case (field.data('prerequisite').value && target.val() == field.data('prerequisite').value):
          case (field.data('prerequisite').format && new RegExp(field.data('prerequisite').format).test(target.val())):
            met += 1;
            break;
        }
      });
      
      return (met == field.data('prerequisite').target.split(',').length);
    }, // module.prerequisites()
    
    errors: function(field){
      var module = this;
      
      if (typeof console != "undefined") {
        console.group('‘' + field.attr('name') + '’', 'is invalid.');
        
        jQuery.each(field.data('validations.errors'), function(rule, message){
          console.log('[' + rule + ']', message);
        });
        
        console.groupEnd();
      }
    }, // module.errors()
    
    // all specific validation-type methods are grouped under module.validator
    validator: {
      presence: function(field){
        var module = this;

        if (field.data('validations').presence) {
          if (field.val() == "") {
            field.data('validations.valid', false);
            field.data('validations.errors').presence = field.data('validations').presence.message ||
              module.message('data-validation-presence');
          } else {
            delete field.data('validations.errors').presence;            
          }
        }
      }, // module.validator.presence()
      
      // TODO: rename to lengthWithin
      lengthRange: function(field){
        var module = this;

        if (field.data('validations').lengthRange) {
          var bounds = jQuery.map(field.data('validations').lengthRange.rule.split('..'), function(bound){
            return parseInt(bound, 10);
          });

          if (field.val().length < bounds[0] || field.val().length > bounds[1]) {
            field.data('validations.valid', false);
            field.data('validations.errors').lengthRange = field.data('validations').lengthRange.message ||
              module.message('data-validation-length', bounds[0], bounds[1]);
          } else {
            delete field.data('validations.errors').lengthRange;
          }
        }
      }, // module.validator.lengthRange()
      
      // TODO: implement lengthMin and lengthMax (minLength and maxLength ?)
      // see: http://rubydoc.info/gems/dm-validations/DataMapper/Validations/ValidatesLength

      unique: function(field){
        var module = this;

        if (field.data('validations').unique) {
          field.data('validations.promise', jQuery.post(field.data('validations').unique.rule, field.attr('name') + '=' + field.val()));
          
          module.incrementPending(form);
          
          field.data('validations.promise').always(function(){ module.decrementPending(form); });
          field.data('validations.promise').done(function(unique){
            if (unique == false) {
              field.data('validations.valid', false);
              field.data('validations.errors').unique = field.data('validations').unique.message ||
                module.message('data-validation-unique');
            } else {
              delete field.data('validations.errors').unique;
            }
          });
          
          // resolve if no response received after 15 seconds
          window.setTimeout(function(){
            field.data('validations.promise').resolve();
          }, 15000);
        }
      }, // module.validator.unique()
      
      format: function(field){
        var module = this;

        if (field.data('validations').format) {
          var pattern = new RegExp(field.data('validations').format.rule);
          if (pattern.test(field.val()) == false) {
            field.data('validations.valid', false);
            field.data('validations.errors').format = field.data('validations').format.message ||
              module.message('data-validation-format', pattern.toString());
          } else {
            delete field.data('validations.errors').format;
          }
        }
      }, // module.validator.format()
      
      confirmation: function(field){
        var module  = this;
        var form    = field.closest('form');

        if (field.data('validations').confirmation != undefined) {
          var name = field.data('validations').confirmation.rule;
          if (field.val() != $('[name=' + name + ']', form).val()) {
            field.data('validations.valid', false);
            field.data('validations.errors').confirmation = field.data('validations').confirmation.message ||
              module.message('data-validation-confirmation', name);
          } else {
            delete field.data('validations.errors').confirmation;
          }
        }
      }, // module.validator.confirmation()

      // TODO: functionally this is identical to validator.unique, so the two should be merged.
      remoteMethod: function(field){
        var module = this;

        if (field.data('validations').remoteMethod != undefined) {
          jQuery.post(field.data('validations').remoteMethod.rule, field.attr('name') + '=' + field.val(), function(result){
            if (result == false) {
              field.data('validations.valid', false);
              field.data('validations.errors').remoteMethod = field.data('validations').remoteMethod.message ||
                module.message('data-validation-remote-method');
            } else {
              delete field.data('validations.errors').remoteMethod;
            }
          });  
        }
      } // module.validator.remoteMethod()
      
    }, // module.validator
    
    message: function(key){
      var module = this;
      var message = module.messages[key];
      
      if (arguments.length > 1) {
        jQuery.each(arguments, function(i, arg){
          if (i > 0) message = message.replace('{' + (i-1) + '}', arg);
        });
      }
      
      return message;
    }, // module.message()
    
    incrementPending: function(form){
      form.data('validations.pending', form.data('validations.pending') + 1);
    }, // module.incrementPending()

    decrementPending: function(form){
      if (form.data('validations.pending') > 0) {
        form.data('validations.pending', form.data('validations.pending') - 1);
        
        if (form.data('validations.pending') == 0) {
          // resolve the promise for the overall form here?
        }
      }
    }, // module.decrementPending()
    
    camelCase: function(string){
      return string.replace(/-([a-z])/g, function(m){
        return m[1].toUpperCase();
      });
    } // module.camelCase()
  };
  
  module.init();
  return module;
}());