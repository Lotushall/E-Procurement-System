@props(['url'])
<tr>
<td class="header">
<a href="{{ $url }}" style="display: inline-block;">
<img src="{{ Illuminate\Support\Facades\Storage::disk('public')->url('images/lotushall_logo.png') }}" class="logo" alt="{{ config('app.name') }} Logo">
</a>
</td>
</tr>
