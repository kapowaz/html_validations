require 'rubygems'
require 'bundler'
Bundler.require

class Validations < Sinatra::Base
  set :root,          File.expand_path('../', __FILE__)
  set :views,         File.dirname(__FILE__) + '/app/views'
  set :public_folder, File.dirname(__FILE__) + '/public'
  
  configure :development do
    DataMapper.setup :default, YAML.load(File.new("config/database.yml"))[:development]
  end
  
  configure :production do
    DataMapper.setup(:default, ENV['DATABASE_URL'])
  end
  
  get "/" do
    erb :index
  end
  
  post "/register" do
    @user = User.new(
      :login                 => params[:login], 
      :displayname           => params[:displayname], 
      :email                 => params[:email],
      :password              => params[:password],
      :password_confirmation => params[:password_confirmation]
    )
    
    if @user.valid?
      @user.save
      erb :success
    else
      # TODO: show registration form again with errors
      @errors       = @user.errors.to_hash
      erb :index
    end
  end
  
  # Availability POST endpoints
  
  post "/available/email" do
    content_type :json
    User.all(:email => params[:email]).any? ? "false" : "true"
  end
  
  post "/available/login" do
    content_type :json
    User.all(:login => params[:login]).any? ? "false" : "true"
  end
  
  # these two are provided for GET requests as an alternative
  
  get "/available/email/:email" do |email|
    content_type :json
    User.all(:email => email).any? ? "false" : "true"
  end
  
  get "/available/login/:login" do |login|
    content_type :json
    User.all(:login => login).any? ? "false" : "true"
  end
  
end

Dir[File.join(File.dirname(__FILE__), 'app/**/*.rb')].sort.each { |f| require f }

DataMapper.finalize
DataMapper.auto_upgrade!