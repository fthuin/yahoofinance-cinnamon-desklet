# Yahoo Finance Cinnamon Desklet

![Screenshot](/capture.png)

## Description

This repository contains the directory "yahoostocks@fthuin". You can
download it and move it in ~/.local/share/cinnamon/desklets/

This will show (by default every 10 minutes) updated data from Yahoo
Finance on your cinnamon desktop. You can choose which quotes you want to display
in the settings by removing or adding quotes symbols.

This desklet was inspired by the stocks applet from adonut
(http://cinnamon-spices.linuxmint.com/applets/view/187) but it retrieved
data from Google Finance API which is deprecated.

Tested with Linux Mint 17.2 / Cinnamon 2.6.13 (Fully functional)

## Release logs

### 0.2 - Aug 25, 2015

Features:

 - reading symbols from the settings instead of the stocks.list file
 - slightly improved error handling, it prints error messages into the console instead of crashing

### 0.1.0 - Jul 15, 2015

Features:

 - reading width, height and delay from the settings
 - resize main box by the changes of width and height
 - reading symbols from the stocks.list file
 - loading stock quotes from yahoo api filtered by the symbols
 - displaying stock quote data in a vertically scrollable table in the main box
 - update stock quote data regularly based on the delay minutes


## This program is a free software:

You can redistribute it and/or modify it if you want, but be fair 

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General
Public License for more details.

You should have received a copy of the GNU General Public License along
with this program. If not, see http://www.gnu.org/licenses/.

