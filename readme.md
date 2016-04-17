
#Project Proposal

Our project aims to develop a visual analytic platform to mine and visualize data to help investors explore how the stock market is moving.
 
Getting valuable data and sentimental analysis come as hard tasks for this project. Large amount of human-generate message data is complex to analysis and originally we can only get users’ info, which stock the user is talking and the total amount of ‘like/unlike/reshare’ from the message table. All the data we get at first can not give accurate evaluation of the market mood. For example, if we count ‘like’ number of one certain stock to define its market consensus, it may be not precise because not all the ‘like’ represent the real positive mood of the user. In this way, semantic analysis seems necessary together with some other significant attributes.
 
Thus, we want to help users filter and visualize the tweets data so that they can understand the activities and market consensus of the stocks they are watching as well as the credibility and real-time data visualization such as overview monitoring of the stock market. We need to pull data in sections like trending, investor-relation to give a further and concise analysis and visualization in aspects of the average recommendation, the market trending and the company/trader credibility and so on.

#What questions do you want to be able to answer with your visualization? 

As for this project, questions that we want to be able to answer with our visualization are shown below: 
1. What is the top ten stocks in Stocktwits? How to get people’s view of these stocks?
A trader or manager need to check the certain stock’s price and its market mood frequently. However, the trader might miss a very important message like the most hot stocks in stocktwits. Therefore, this platform have a responsibility to remind the trader or manager that the most hot stocks. It will be count by the message count in real-time, moreover, if the people like these message will be a concern as well. Therefore, it is important to provide a top hot stocks and it related information about people’s attention.

2. What is customers’ mood towards one certain stock
For each message that customers post, there will be like / unlike / reshare options for other users. By accounting the number of these options group by the stock id, category by user’s identification, we can account the average mood of customers towards particular stock changing over time. However, since the ‘ like/unlike/reshare ’ can not always represent the true positive/negative emotion towards one certain stock, semantic analysis  together with a new function to realize it seem necessary with the data mined from ‘trending’, ‘symbol’ and ‘suggested’.

3. What is the relationship between the messages and stock’s price?
For one message, there will be a large amount of information in its body. With the change of stock market, a user may post messages if he has any new point of views towards the stock. In this way, we infer that  there may be some relationships between the message and the price of stocks. We want to conclude some data from the message and find out whether it has any links towards the stock’s price.

4. How’s the market mood generate? What did the most people say?
Since the trader or manager might need to drill the certain message and the majority mood of a certain stock, for example, after certain events, people may have a lot of views for the stock. Therefore, the trader needs to check, if the change of the price is entirely about that events or not.

#What is your data about? Where does it come from? What attributes are you going to use? What is their meaning? What are their attribute types (data abstraction)? Do you plan to generate derived attributes? If yes, which and why? 

Our original data is called from API of stocktwits.com. We queried the data and saved them into .csv and .json. used by our interface. The original dataset contains data from an stock tweets coming from stocktwits.com. Most real-time data actually comes from the recent 30 messages post by the verified customers or the returning list that update in 5-minute intervals. The following are the relevant tables to analyze the three entities:
* 		User
* 		Stock
* 		Message

As we mentioned before, we are going to specifically look into the influence that moods may have on stock business and realize overview monitoring on real-time data. Since, the main data we can get are messages that user posted on the StockTwits, other users attitudes towards to the messages, how many users have ever posted messages about one stock, how many messages that are related to one stock, how many users like or dislike or they reshare the messages which related to one specific stock and some other information which is related. We can get the data about the number of people and who they are, care about messages related to one specific stock, but we cannot get the number of the messages related to a specific stock because sometimes users do not care what the messages write about, the number of messages related to one specific stock can indicate how popular it is. So we have to count the every time when the name of the specific stock shows up. We also want to dig some information about sentimental analysis, so we decide to figure out a way to make different attitudes have different weight. Then, we can decide whether it is bull or bear based on very simple arithmetic rule.We also want to display the specific attitude of users towards a specific stock based on the distribution of the user label, for example, if we look into users who like the message about a stock. 
