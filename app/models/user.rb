# encoding: utf-8
# require 'dm-is-authenticatable'

class User
  include DataMapper::Resource

  property :id,                     Serial
  property :login,                  String,     :messages => { :length => "Your login name needs to be between 6 and 20 characters long" }
  property :email,                  String,     :format => :email_address, :messages => { :format => "That doesn't look like an email address" }
  property :displayname,            String
  
  is :authenticatable

  validates_presence_of     :login,                  :message => "You need to choose a login name"
  validates_length_of       :login,                  :within  => 6..20
  validates_uniqueness_of   :login,                  :message => "Somebody has already registered using that login name"
  validates_presence_of     :email,                  :message => "You need to provide your email address"
  validates_uniqueness_of   :email,                  :message => "Somebody has already registered using that email address"
  validates_presence_of     :password,               :message => "You need to enter a password"
  validates_presence_of     :password_confirmation,  :message => "You need to confirm your password by typing it again here"
  validates_confirmation_of :password,               :message => "Password and confirmation need to be the same"
end
