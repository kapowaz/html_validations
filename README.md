Proposal for extending HTML input elements with client-side validation
======================================================================

Synopsis
--------

Currently HTML has provisions for simple validation in two ways: a presence (required) field flag, and a maxlength attribute on textarea elements. There is also a (as yet non-standardised) attribute to supply a [regular expression pattern](http://www.whatwg.org/specs/web-apps/current-work/multipage/common-input-element-attributes.html#attr-input-pattern) which the input value must match to pass. None of these validation types allow the web page to customise the actual message displayed to the visitor when validation fails. Most web applications require far richer validations for this and other reasons, and so web developers frequently need to implement two validation frameworks: one that checks form input at the server, and potentially also at the client, in order to support a more responsive user interface.

Modern Object Relational Mapping frameworks such as [DataMapper](http://datamapper.org/) and [ActiveRecord](http://http://ar.rubyonrails.org/) also commonly implement validations as a way of ensuring that a given resource created within the ORM is valid before it is saved. These validations take the form of a rule and one or more messages associated with the rule when the validation isn't met, for example in [DataMapper](http://datamapper.org/docs/validations.html) you might have a data model for registered users that looked like this:

    class User
      include DataMapper::Resource
    
      property :id,                     Serial
      property :login,                  String,     :messages => { :length => "Your login name needs to be between 6 and 20 characters long" }
      property :email,                  String,     :format => :email_address, :messages => { :format => "That doesn't look like an email address" }
      property :displayname,            String
      property :password,               BCryptHash
      property :password_confirmation,  BCryptHash

      validates_presence_of     :login,                  :message => "You need to choose a login name"
      validates_length_of       :login,                  :within  => 6..20
      validates_uniqueness_of   :login,                  :message => "Somebody has already registered using that login name"
      validates_presence_of     :email,                  :message => "You need to provide your email address"
      validates_uniqueness_of   :email,                  :message => "Somebody has already registered using that email address"
      validates_presence_of     :password,               :message => "You need to enter a password"
      validates_presence_of     :password_confirmation,  :message => "You need to confirm your password by typing it again here"
      validates_confirmation_of :password,               :message => "Password and confirmation need to be the same"
    end

Here, a number of fields on the data model are given a series of rules defining a requirement that they are supplied, that some of them are unique, that the two passwords match, and that the login name is within an acceptable range of sizes. In order to provide client-side validation of these rules, a developer may use a JavaScript framework like jQuery and a plugin such as jQuery Validation to create a set of validation rules that can be checked as data is entered, but without creating a translation layer between the two, it is necessary to duplicate these rules in a different format.

Proposal
--------

Taking the DM Validation pattern as a basis, the proposal is to add a number of new attributes to input elements to support client-side validation. In one particular example (uniqueness) this cannot be validated entirely client-side, as the data store where the unique data is held will need to be queried to verify if the value is unique. In all other cases, the validation can be performed locally and so it should be possible to implement a JavaScript polyfill to add this functionality until user agent support is added.

To take the above example of a user registration form, you may then end up with the following HTML markup:

    <form action="/user/register" method="post" data-validation-message="The form below has some problems. Please correct them before trying again.">
      <label for="user_registration_login">Choose a login name (6-20 characters)</label>
      <input type="text" 
        id="user_registration_login" name="login" 
        data-validation-presence 
        data-validation-length="6..20" 
        data-validation-unique="http://yetanothersocialnetwork.com/user/register/unique/login" 
        data-validation-presence-message="You need to choose a login name"
        data-validation-length-message="Your login name needs to be between 6 and 20 characters long"
        data-validation-unique-message="Somebody has already registered using that login name">
    
      <label for="user_registration_email">Enter your email address</label>
      <input type="email" id="user_registration_email" name="email"
        data-validation-presence
        data-validation-unique="http://yetanothersocialnetwork.com/user/register/unique/email"
        data-validation-format="^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$"
        data-validation-presence-message="You need to provide your email address"
        data-validation-unique-message="Somebody has already registered using that email address"
        data-validation-format-message="That doesn't look like an email address">
  
      <label for="user_registration_displayname">Enter your name as you'd like it displayed to other users</label>
      <input type="text" id="user_registration_displayname" name="displayname">
    
      <label for="user_registration_password">Enter a password</label>
      <input type="password" id="user_registration_password" name="password" 
        data-validation-presence 
        data-validation-confirmation="password_confirmation"
        data-validation-presence-message="You need to enter a password"
        data-validation-confirmation-message="Password and confirmation need to be the same">
    
      <label for="user_registration_password_confirmation">Enter the same password again</label>
      <input type="password" id="user_registration_password_confirmation" name="password_confirmation" 
        data-validation-presence 
        data-validation-confirmation="password"
        data-validation-presence-message="You need to confirm your password by typing it again here"
        data-validation-confirmation-message="Password and confirmation need to be the same">
    
      <input type="submit" value="Register">
    </form>

To explain some of these attributes in a little more detail:

    data-validation-unique
  
This attribute should specify a URI to which this field (and only this field) can be submitted, by HTTP POST, and which should return a JSON response containing true or false depending on whether the value is unique.
  
    data-validation-confirmation
  
This attribute should specify the input name of a single other field to which this field should have an identical value, in order to pass validation. This requirement isn't explicitly mutually required, so one field can be required to be identical to another, but the latter need not require be identical to the former.
  
    data-validation-<type>-message
    
This attribute should specify the message to be displayed when the associated validation type fails.
  
    data-validation-message
  
This attribute (on the form itself) can be used to supply a message to be displayed when *any* field fails validation, as a means of highlighting the issue in a different part of the page to the field with the validation failure itself (e.g. at the top of the page).

Conditional validations
-----------------------

The more complex validation requirements in web applications stem from fields or sets of fields which are conditionally validated based on the state of other fields within the same form. This is a common pattern in both client-side JavaScript validation frameworks and ORM validations and so is another good candidate for a native implementation. Here is a simple example where a commit identifier is required to be supplied for an existing issue only if the issue has a status of ‘fixed’:

    <label for="issue_status">Issue status</label>
    <select id="issue_status" name="issue_status">
      <option value="fixed" selected>Fixed</option>
      <option value="wontfix">Won't Fix</option>
      <option value="duplicate">Duplicate</option>
      <option value="incomplete">Incomplete</option>
      <option value="cannotreproduce">Cannot Reproduce</option>
      <option value="unresolved">Unresolved</option>
    </select>
    
    <label for="issue_fixed_in_commit">Fixed in commit</label>
    <input type="text" id="issue_fixed_in_commit" name="fixed_in_commit"
      data-validation-prerequisite="issue_status"
      data-validation-prerequisite-value="fixed"
      data-validation-presence-message="Please enter the commit identifier this issue was fixed in">
      
As an alternative to supplying a prerequisite *value*, a required format (as a regular expression) can be specified:

    <label for="input_when_logged">When was this logged?</label>
    <input type="text" id="input_when_logged" name="when_logged">
    <label for="input_bar">Bar</label>
    <input type="text" id="input_bar" name="bar"
      data-validation-prerequisite="when_logged"
      data-validation-prerequisite-format="[0-2][0-9]:[0-5][0-9]"
      data-validation-presence-message="Please enter a *bar*">
      
It is possible to have a form with fields whose presence requirement is predicated on multiple other fields’ states. This is done by providing a comma-separated list of values to the `data-validation-prerequisite` attribute:

    [example?]
    
    <label for="input_field_foo">Foo</label>
    <input type="text" id="input_field_foo" name="foo">
    <label for="input_field_bar">Bar</label>
    <input type="text" id="input_field_bar" name="bar">
    <label for="input_field_baz">Baz</label>
    <input type="text" id="input_field_baz" name="baz"
      data-validation-prerequisite="foo,bar"
      data-validation-prerequisite-message="Please enter the commit identifier this issue was fixed in">
      
Specifying the data-validation-prerequisite attribute with the name of one or more fields but without specifying either a `data-validation-prerequisite-value` or `data-validation-prerequisite-format` attribute indicates that any non-empty value for the prerequisite field should trigger the presence requirement of the associated field.
  
Limitations & Extensions
------------------------

Uniqueness is a difficult characteristic to validate, as it cannot be determined client-side; the only way to be certain if a value is unique is to query the data store where that resource resides. This poses an implementation constraint in that the data store needs to provide a public-facing, HTTP-based interface to this information. However, assuming this type of validation can be implemented, the same pattern can be used to perform an arbitrary remote-validation method against a field's value:

    <label for="user_registration_url">Enter your website URL</label>
    <input type="text" id="user_registration_url"
      data-validation-remote-method="http://yetanothersocialnetwork.com/remote/method/url"
      data-validation-remote-method-message="That doesn't appear to be a working URL.">
      
This mechanism would function by POSTing the input value to the URL supplied by `data-validation-remote-method`, which would return a JSON response containing either true or false based on whether the value was considered acceptable.

Should the remote validation endpoint be unavailable for any reason then the field will remain in a non-validated, but *not invalid* state.

Running the sample implementation
---------------------------------

The sample app in this repo is built using [Sinatra](https://github.com/sinatra/sinatra/) and [DataMapper](https://github.com/datamapper/). Simply create a copy of `config/database.example.yml` called `database.yml` with credentials for a local database. For simplicity's sake I'm assuming you're using Bundler:

    $ bundle install
    $ bundle exec thin start