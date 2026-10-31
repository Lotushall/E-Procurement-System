<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('app:purge-soft-deleted-users')->daily()->withoutOverlapping();
Schedule::command('app:open-due-bidding-windows')->everyMinute()->withoutOverlapping();
