<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('app:purge-soft-deleted-users')->daily()->withoutOverlapping();
